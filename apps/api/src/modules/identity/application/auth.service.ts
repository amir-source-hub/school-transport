import { forwardRef, Inject, Injectable, Optional } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { addSeconds, isPast } from 'date-fns';
import { eq, and, desc, isNull, or, gt, sql } from 'drizzle-orm';
import { createHash, randomBytes, randomInt } from 'node:crypto';
import { ConfigService } from '../../../config/config.service';
import { DatabaseService } from '../../../database/database.service';
import {
  users,
  adminUsers,
  adminAuthChallenges,
  otpRequests,
  parents,
  authSessions,
  schoolManagerUsers,
  schoolManagerAssignments,
  schools,
} from '../../../database/schemas';
import { AppError, AuthenticationError, ValidationError } from '../../../common/errors';
import { generateId } from '../../../common/utils';
import { AppLogger } from '../../../common/logger';
import { AuthTokens, LoginResult, OtpResult, VerifyAuthOtpResult } from '../domain/auth.types';
import { JwtPayload, UserRole } from '../../../common/authentication.types';
import { normalizeIranianDigits } from '../../../common/iranian-national-id';
import { OTP_DELIVERY, OtpDelivery } from './otp-delivery.port';
import { AUDIT_PORT, AuditPort } from '../../../common/audit.port';
import { InAppNotificationService } from '../../../infrastructure/notifications/in-app-notification.service';
import { OnboardingService } from './onboarding.service';
import { OperationalMetricsService } from '../../../infrastructure/metrics/operational-metrics.service';

export interface AdminChallengeResult {
  challengeId: string;
  expiresAt: Date;
  cooldownSeconds: number;
  developmentCode?: string;
}

export type ParentCredentialResult =
  | LoginResult
  | {
      user: null;
      onboarding: Awaited<ReturnType<OnboardingService['beginOrResume']>> & { nationalId: string };
    };

export const ADMIN_IDENTITY_LIST_LIMIT = 500;

@Injectable()
export class AuthService {
  constructor(
    @Inject(JwtService) private readonly jwtService: JwtService,
    @Inject(forwardRef(() => ConfigService)) private readonly config: ConfigService,
    @Inject(forwardRef(() => DatabaseService)) private readonly db: DatabaseService,
    @Inject(forwardRef(() => AppLogger)) private readonly logger: AppLogger,
    @Inject(OTP_DELIVERY) private readonly otpDelivery: OtpDelivery,
    @Inject(forwardRef(() => InAppNotificationService))
    private readonly notifications: InAppNotificationService,
    @Inject(AUDIT_PORT) private readonly audit: AuditPort,
    @Optional()
    @Inject(forwardRef(() => OnboardingService))
    private readonly onboarding?: OnboardingService,
    @Optional()
    @Inject(forwardRef(() => OperationalMetricsService))
    private readonly metrics?: OperationalMetricsService,
  ) {}

  async getAdmins() {
    return this.db.db
      .select({
        id: adminUsers.id,
        username: adminUsers.username,
        firstName: adminUsers.firstName,
        lastName: adminUsers.lastName,
        phoneNumber: adminUsers.phoneNumber,
        email: adminUsers.email,
        status: adminUsers.status,
        lastLoginAt: adminUsers.lastLoginAt,
        createdAt: adminUsers.createdAt,
      })
      .from(adminUsers)
      .orderBy(desc(adminUsers.createdAt), desc(adminUsers.id))
      .limit(ADMIN_IDENTITY_LIST_LIMIT);
  }

  async getAdmin(adminId: string) {
    const admins = await this.db.db
      .select({
        id: adminUsers.id,
        username: adminUsers.username,
        firstName: adminUsers.firstName,
        lastName: adminUsers.lastName,
        phoneNumber: adminUsers.phoneNumber,
        email: adminUsers.email,
        status: adminUsers.status,
        lastLoginAt: adminUsers.lastLoginAt,
        createdAt: adminUsers.createdAt,
      })
      .from(adminUsers)
      .where(eq(adminUsers.id, adminId))
      .limit(1);
    if (!admins[0]) throw new ValidationError('Administrator was not found.');
    return admins[0];
  }

  async createAdmin(data: {
    username: string;
    firstName: string;
    lastName: string;
    phoneNumber: string;
    email?: string;
    password: string;
  }) {
    await this.ensureAdminIdentityIsUnique(data.username, data.phoneNumber);
    if (data.password.length < 8) {
      throw new ValidationError('Password must be at least 8 characters long.');
    }
    const [admin] = await this.db.db
      .insert(adminUsers)
      .values({
        id: generateId(),
        username: data.username,
        firstName: data.firstName,
        lastName: data.lastName,
        phoneNumber: data.phoneNumber,
        email: data.email || null,
        status: 'ACTIVE',
        passwordHash: await argon2.hash(data.password),
      })
      .returning();
    return admin;
  }

  async updateAdmin(
    adminId: string,
    data: Partial<{
      username: string;
      firstName: string;
      lastName: string;
      phoneNumber: string;
      email: string;
      password: string;
    }>,
    actor?: { id: string; ip?: string },
  ) {
    const current = await this.getAdmin(adminId);
    await this.ensureAdminIdentityIsUnique(
      data.username ?? current.username,
      data.phoneNumber ?? current.phoneNumber,
      adminId,
    );

    const password = data.password ?? '';
    if (password.length > 0 && password.length < 8) {
      throw new ValidationError('Password must be at least 8 characters long.');
    }

    const changes: Record<string, unknown> = {
      ...data,
      ...(password.length > 0 ? { passwordHash: await argon2.hash(password) } : {}),
      ...(data.email !== undefined ? { email: data.email || null } : {}),
      updatedAt: new Date(),
    };
    delete changes.password;

    const sensitiveChanged =
      (data.username !== undefined && data.username !== current.username) ||
      (data.phoneNumber !== undefined && data.phoneNumber !== current.phoneNumber) ||
      password.length > 0;

    const [admin] = await this.db.db
      .update(adminUsers)
      .set(changes)
      .where(eq(adminUsers.id, adminId))
      .returning();

    if (sensitiveChanged) {
      await this.revokeAllSessions(adminId, 'ADMIN', 'CREDENTIALS_CHANGED');
    }
    await this.audit.record({
      actorType: 'ADMIN',
      actorId: actor?.id ?? adminId,
      entityType: 'ADMIN',
      entityId: adminId,
      action: 'ADMIN_EDIT',
      previousValues: { status: current.status },
      newValues: { status: admin.status },
      ipAddress: actor?.ip,
    });
    return admin;
  }

  async setAdminStatus(
    adminId: string,
    status: 'ACTIVE' | 'INACTIVE',
    actor?: { id: string; ip?: string },
  ) {
    if (status === 'INACTIVE') {
      if (actor?.id && actor.id === adminId) {
        throw new ValidationError('You cannot disable your own administrator account.');
      }
      const [target] = await this.db.db
        .select({
          id: adminUsers.id,
          status: adminUsers.status,
        })
        .from(adminUsers)
        .where(eq(adminUsers.id, adminId))
        .limit(1);
      if (!target) throw new ValidationError('Administrator was not found.');
      if (target.status === 'ACTIVE') {
        const [active] = await this.db.db
          .select({ count: sql<number>`count(*)::int` })
          .from(adminUsers)
          .where(eq(adminUsers.status, 'ACTIVE'));
        if (Number(active?.count ?? 0) <= 1) {
          throw new ValidationError('You cannot disable the last active administrator.');
        }
      }
    }

    const [admin] = await this.db.db.transaction(async (txn) => {
      const updated = await txn
        .update(adminUsers)
        .set({ status, updatedAt: new Date() })
        .where(eq(adminUsers.id, adminId))
        .returning();
      if (updated[0] && status === 'INACTIVE') {
        await txn
          .update(authSessions)
          .set({ revokedAt: new Date(), revocationReason: 'ACCOUNT_DISABLED' })
          .where(
            and(
              eq(authSessions.subjectId, adminId),
              eq(authSessions.role, 'ADMIN'),
              isNull(authSessions.revokedAt),
            ),
          );
      }
      return updated;
    });
    if (!admin) throw new ValidationError('Administrator was not found.');

    await this.audit.record({
      actorType: 'ADMIN',
      actorId: actor?.id ?? adminId,
      entityType: 'ADMIN',
      entityId: adminId,
      action: status === 'INACTIVE' ? 'ADMIN_DISABLED' : 'ADMIN_ENABLED',
      previousValues: { status: status === 'INACTIVE' ? 'ACTIVE' : 'INACTIVE' },
      newValues: { status },
      ipAddress: actor?.ip,
    });
    return admin;
  }

  private async ensureAdminIdentityIsUnique(
    username: string,
    phoneNumber: string,
    excludedAdminId?: string,
  ) {
    const matches = await this.db.db
      .select({ id: adminUsers.id })
      .from(adminUsers)
      .where(or(eq(adminUsers.username, username), eq(adminUsers.phoneNumber, phoneNumber)));
    if (matches.some(({ id }) => id !== excludedAdminId)) {
      throw new ValidationError(
        'An administrator with this username or phone number already exists.',
      );
    }
  }

  async requestAuthOtp(
    phoneNumber: string,
    role: 'PARENT' = 'PARENT',
    requestIp?: string,
  ): Promise<OtpResult> {
    if (role !== 'PARENT') {
      throw new ValidationError('Administrators must sign in through the two-step admin login.');
    }
    return this.sendOtp(phoneNumber, 'AUTH_PARENT', requestIp);
  }

  async authenticateParent(
    phoneNumber: string,
    nationalId: string,
    context?: SessionContext,
    rememberMe = false,
    onboardingToken?: string,
  ): Promise<ParentCredentialResult> {
    const genericError = () => new AuthenticationError('شماره همراه سرپرست یا کد ملی صحیح نیست.');
    const account = await this.findAccountByPhone(phoneNumber, 'PARENT');
    const [nationalIdOwner] = await this.db.db
      .select({ userId: parents.userId, status: users.accountStatus })
      .from(parents)
      .innerJoin(users, eq(users.id, parents.userId))
      .where(eq(parents.nationalId, nationalId))
      .limit(1);
    // A finalized family identity is unique by both phone number and national ID.
    // Matching only one of them must never create or resume a different account.
    if (
      nationalIdOwner?.status === 'ACTIVE' &&
      (!account || account.id !== nationalIdOwner.userId)
    ) {
      throw genericError();
    }
    const needsOnboarding =
      !account || account.status === 'PENDING' || account.status === 'EXPIRED';

    if (needsOnboarding) {
      if (this.config.featureOnboarding === false) throw genericError();
      let userId = account?.id;
      const pendingUsername = `${phoneNumber}:${nationalId}`;
      if (!userId) {
        userId = generateId();
        await this.db.db.insert(users).values({
          id: userId,
          username: pendingUsername,
          phoneNumber,
          accountStatus: 'PENDING',
        });
      } else {
        const existingOnboarding =
          onboardingToken && this.onboarding
            ? await this.onboarding.resolve(onboardingToken)
            : undefined;
        const ownsPendingDraft =
          account?.username === pendingUsername ||
          (existingOnboarding?.userId === userId && existingOnboarding.phoneNumber === phoneNumber);
        if (!ownsPendingDraft) throw genericError();
        // A PENDING row is only a restricted draft owner, not a completed account.
        // Its credentials may be corrected only by the browser that owns the draft.
        // ACTIVE accounts still follow the strict parent match below.
        await this.db.db
          .update(users)
          .set({
            username: pendingUsername,
            accountStatus: 'PENDING',
            phoneNumber,
            updatedAt: new Date(),
          })
          .where(eq(users.id, userId));
      }
      if (!this.onboarding) throw new AuthenticationError('Onboarding is not configured.');
      const onboarding = await this.onboarding.beginOrResume(userId, phoneNumber);
      this.logger.log('Parent onboarding session issued with fixed credentials.');
      return { user: null, onboarding: { ...onboarding, nationalId } };
    }

    if (account.status !== 'ACTIVE') throw genericError();
    const familyParents = await this.db.db
      .select({ id: parents.id, phoneNumber: parents.phoneNumber, nationalId: parents.nationalId })
      .from(parents)
      .where(eq(parents.userId, account.id));
    const matchingParent = familyParents.find(
      (parent) => parent.phoneNumber === phoneNumber && parent.nationalId === nationalId,
    );
    if (!matchingParent) throw genericError();

    await this.db.db.transaction(async (txn) => {
      await txn
        .update(parents)
        .set({ isPrimaryContact: false, updatedAt: new Date() })
        .where(eq(parents.userId, account.id));
      await txn
        .update(parents)
        .set({ isPrimaryContact: true, updatedAt: new Date() })
        .where(eq(parents.id, matchingParent.id));
      await txn
        .update(users)
        .set({ phoneNumber, lastLoginAt: new Date(), updatedAt: new Date() })
        .where(eq(users.id, account.id));
    });
    const tokens = await this.generateTokens(account.id, 'PARENT', context, undefined, rememberMe);
    this.logger.log('PARENT logged in with fixed credentials.');
    return {
      user: { id: account.id, username: account.username, phoneNumber, role: 'PARENT' },
      ...tokens,
    };
  }

  async verifyAuthOtp(
    phoneNumber: string,
    code: string,
    role: 'PARENT' = 'PARENT',
    context?: SessionContext,
    rememberMe = false,
  ): Promise<VerifyAuthOtpResult> {
    if (role !== 'PARENT') {
      throw new ValidationError('Administrators must sign in through the two-step admin login.');
    }
    const account = await this.findAccountByPhone(phoneNumber, 'PARENT');
    await this.verifyOtp(phoneNumber, 'AUTH_PARENT', code);

    const needsOnboarding =
      !account || account.status === 'PENDING' || account.status === 'EXPIRED';
    if (!needsOnboarding && account.status !== 'ACTIVE') {
      throw new AuthenticationError('Account is disabled or suspended.');
    }

    if (needsOnboarding) {
      if (this.config.featureOnboarding === false) {
        throw new AuthenticationError('Authentication failed.');
      }
      let userId = account?.id;
      if (!userId) {
        userId = generateId();
        await this.db.db.insert(users).values({
          id: userId,
          username: phoneNumber,
          phoneNumber,
          accountStatus: 'PENDING',
        });
        this.logger.log('Parent onboarding account created after OTP verification.');
      } else {
        await this.db.db
          .update(users)
          .set({ accountStatus: 'PENDING', phoneNumber, updatedAt: new Date() })
          .where(eq(users.id, userId));
      }
      if (!this.onboarding) {
        throw new AuthenticationError('Onboarding is not configured.');
      }
      const onboardingSession = await this.onboarding.beginOrResume(userId, phoneNumber);
      this.logger.log('Onboarding session issued for a verified phone.');
      return { user: null, onboarding: onboardingSession };
    }

    if (account.status !== 'ACTIVE') {
      throw new AuthenticationError('Account is disabled or suspended.');
    }
    const familyParents = await this.db.db
      .select({ id: parents.id, phoneNumber: parents.phoneNumber })
      .from(parents)
      .where(eq(parents.userId, account.id));
    if (familyParents.length > 0) {
      const matchingParent = familyParents.find((parent) => parent.phoneNumber === phoneNumber);
      if (!matchingParent) {
        throw new AuthenticationError(
          'The login phone number must belong to one of the registered parents.',
        );
      }
      await this.db.db.transaction(async (txn) => {
        await txn
          .update(parents)
          .set({ isPrimaryContact: false, updatedAt: new Date() })
          .where(eq(parents.userId, account!.id));
        await txn
          .update(parents)
          .set({ isPrimaryContact: true, phoneVerifiedAt: new Date(), updatedAt: new Date() })
          .where(eq(parents.id, matchingParent.id));
        await txn
          .update(users)
          .set({ phoneNumber, updatedAt: new Date() })
          .where(eq(users.id, account!.id));
      });
    }
    await this.db.db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, account.id));
    const tokens = await this.generateTokens(account.id, 'PARENT', context, undefined, rememberMe);
    this.logger.log('PARENT logged in with OTP.');
    return {
      user: { id: account.id, username: account.username, phoneNumber, role: 'PARENT' },
      ...tokens,
    };
  }

  async finalizeOnboarding(
    token: string,
    context?: SessionContext,
    rememberMe = false,
  ): Promise<LoginResult> {
    if (!this.onboarding) {
      throw new AuthenticationError('Onboarding is not configured.');
    }
    const session = await this.onboarding.resolve(token);
    if (!session) {
      throw new AuthenticationError('Invalid or expired onboarding session.');
    }
    if (!(await this.onboarding.isPanelReady(session.userId))) {
      throw new ValidationError(
        'Onboarding cannot be completed until an enrollment contract is accepted.',
      );
    }
    await this.onboarding.completeOnboarding(session.id, session.userId);
    await this.db.db
      .update(users)
      .set({ username: session.phoneNumber, updatedAt: new Date() })
      .where(eq(users.id, session.userId));
    const tokens = await this.generateTokens(
      session.userId,
      'PARENT',
      context,
      undefined,
      rememberMe,
    );
    this.logger.log('Onboarding completed; parent account activated.');
    return {
      user: {
        id: session.userId,
        username: session.phoneNumber,
        phoneNumber: session.phoneNumber,
        role: 'PARENT',
      },
      ...tokens,
    };
  }

  async getPendingNationalId(userId: string): Promise<string> {
    const [account] = await this.db.db
      .select({ username: users.username, status: users.accountStatus })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    if (!account || account.status !== 'PENDING') {
      throw new AuthenticationError('Invalid onboarding identity.');
    }
    const separator = account.username.indexOf(':');
    if (separator < 0) throw new AuthenticationError('Invalid onboarding identity.');
    return account.username.slice(separator + 1);
  }

  async createAdminChallenge(
    username: string,
    password: string,
    requestIp?: string,
  ): Promise<AdminChallengeResult> {
    const genericError = () => new AuthenticationError('The username or password is incorrect.');

    const records = await this.db.db
      .select({
        id: adminUsers.id,
        username: adminUsers.username,
        phoneNumber: adminUsers.phoneNumber,
        status: adminUsers.status,
        passwordHash: adminUsers.passwordHash,
      })
      .from(adminUsers)
      .where(eq(adminUsers.username, username))
      .limit(1);
    const record = records[0];
    if (!record || record.status !== 'ACTIVE' || !record.passwordHash) {
      throw genericError();
    }
    const valid = await argon2.verify(record.passwordHash, password);
    if (!valid) throw genericError();

    const challengeToken = randomBytes(24).toString('base64url');
    await this.db.db.insert(adminAuthChallenges).values({
      id: generateId(),
      adminId: record.id,
      challengeHash: this.hashToken(challengeToken),
      expiresAt: addSeconds(new Date(), this.config.adminChallengeTtlSeconds),
      requestIp: requestIp || null,
    });
    this.logger.log('Admin password factor verified; OTP requested.');

    const otp = await this.sendOtp(record.phoneNumber, 'AUTH_ADMIN', requestIp);
    return {
      challengeId: challengeToken,
      expiresAt: otp.expiresAt,
      cooldownSeconds: otp.cooldownSeconds,
      developmentCode: otp.developmentCode,
    };
  }

  async loginAdmin(
    username: string,
    password: string,
    context?: SessionContext,
    rememberMe = false,
  ): Promise<LoginResult> {
    const genericError = () => new AuthenticationError('The username or password is incorrect.');
    const [record] = await this.db.db
      .select({
        id: adminUsers.id,
        username: adminUsers.username,
        phoneNumber: adminUsers.phoneNumber,
        status: adminUsers.status,
        passwordHash: adminUsers.passwordHash,
      })
      .from(adminUsers)
      .where(eq(adminUsers.username, username))
      .limit(1);
    if (!record || record.status !== 'ACTIVE' || !record.passwordHash) throw genericError();
    if (!(await argon2.verify(record.passwordHash, password))) throw genericError();
    await this.db.db
      .update(adminUsers)
      .set({ lastLoginAt: new Date() })
      .where(eq(adminUsers.id, record.id));
    const tokens = await this.generateTokens(record.id, 'ADMIN', context, undefined, rememberMe);
    this.logger.log('Admin logged in with username and password.');
    return {
      user: {
        id: record.id,
        username: record.username,
        phoneNumber: record.phoneNumber,
        role: 'ADMIN',
      },
      ...tokens,
    };
  }

  async loginSchoolManager(
    username: string,
    password: string,
    context?: SessionContext,
    rememberMe = false,
  ): Promise<LoginResult> {
    const genericError = () => new AuthenticationError('نام کاربری یا رمز عبور صحیح نیست.');
    const normalized = this.normalizeManagerUsername(username);
    const [record] = await this.db.db
      .select({
        id: schoolManagerUsers.id,
        username: schoolManagerUsers.username,
        phoneNumber: schoolManagerUsers.phoneNumber,
        status: schoolManagerUsers.status,
        passwordHash: schoolManagerUsers.passwordHash,
        mustChangeCredentials: schoolManagerUsers.mustChangeCredentials,
        failedLoginCount: schoolManagerUsers.failedLoginCount,
        lockedUntil: schoolManagerUsers.lockedUntil,
      })
      .from(schoolManagerUsers)
      .where(eq(schoolManagerUsers.username, normalized))
      .limit(1);

    if (!record || record.status !== 'ACTIVE' || !record.passwordHash) throw genericError();

    if (record.lockedUntil && !isPast(new Date(record.lockedUntil))) {
      throw new AppError(
        'ACCOUNT_LOCKED',
        'حساب مدیر مدرسه به دلیل تلاش‌های ناموفق موقتاً قفل شده است. بعداً دوباره تلاش کنید.',
        423,
      );
    }

    const valid = await argon2.verify(record.passwordHash, password);
    if (!valid) {
      const attempts = record.failedLoginCount + 1;
      const lock = attempts >= this.config.managerMaxFailedLoginAttempts;
      await this.db.db
        .update(schoolManagerUsers)
        .set({
          failedLoginCount: lock ? 0 : attempts,
          lockedUntil: lock ? addSeconds(new Date(), this.config.managerLockoutSeconds) : null,
          updatedAt: new Date(),
        })
        .where(eq(schoolManagerUsers.id, record.id));
      await this.audit.record({
        actorType: 'SCHOOL_MANAGER',
        actorId: record.id,
        entityType: 'SCHOOL_MANAGER',
        entityId: record.id,
        action: lock ? 'SCHOOL_MANAGER_LOCKED' : 'SCHOOL_MANAGER_LOGIN_FAILED',
        ipAddress: context?.ipAddress,
      });
      throw genericError();
    }

    await this.db.db
      .update(schoolManagerUsers)
      .set({
        failedLoginCount: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(schoolManagerUsers.id, record.id));
    const tokens = await this.generateTokens(
      record.id,
      'SCHOOL_MANAGER',
      context,
      undefined,
      rememberMe,
    );
    this.logger.log('School manager logged in with username and password.');
    return {
      user: {
        id: record.id,
        username: record.username,
        phoneNumber: record.phoneNumber,
        role: 'SCHOOL_MANAGER',
        mustChangeCredentials: record.mustChangeCredentials,
      },
      ...tokens,
    };
  }

  async provisionSchoolManager(
    data: {
      username: string;
      firstName: string;
      lastName: string;
      phoneNumber: string;
      email?: string;
      schoolId: string;
      password: string;
    },
    actor?: { id: string; ip?: string },
  ) {
    const username = this.normalizeManagerUsername(data.username);
    await this.ensureSchoolManagerIdentityIsUnique(username, data.phoneNumber);
    const [school] = await this.db.db
      .select({ id: schools.id })
      .from(schools)
      .where(eq(schools.id, data.schoolId))
      .limit(1);
    if (!school) throw new ValidationError('School was not found.');

    const managerId = generateId();
    await this.db.db.transaction(async (txn) => {
      await txn.insert(schoolManagerUsers).values({
        id: managerId,
        username,
        firstName: data.firstName,
        lastName: data.lastName,
        phoneNumber: data.phoneNumber,
        email: data.email || null,
        passwordHash: await argon2.hash(data.password),
        status: 'ACTIVE',
        mustChangeCredentials: true,
      });
      await txn.insert(schoolManagerAssignments).values({
        id: generateId(),
        managerUserId: managerId,
        schoolId: data.schoolId,
        isPrimary: true,
        status: 'ACTIVE',
      });
    });
    this.logger.log('School manager account provisioned with temporary credentials.');
    await this.audit.record({
      actorType: 'ADMIN',
      actorId: actor?.id ?? 'system',
      entityType: 'SCHOOL_MANAGER',
      entityId: managerId,
      action: 'SCHOOL_MANAGER_PROVISIONED',
      newValues: { schoolId: data.schoolId, temporaryCredentials: true },
      ipAddress: actor?.ip,
    });
    return { id: managerId };
  }

  async changeSchoolManagerCredentials(
    managerId: string,
    data: { currentPassword: string; newUsername: string; newPassword: string },
    actor?: { id: string; ip?: string },
  ) {
    const [record] = await this.db.db
      .select({
        id: schoolManagerUsers.id,
        username: schoolManagerUsers.username,
        phoneNumber: schoolManagerUsers.phoneNumber,
        passwordHash: schoolManagerUsers.passwordHash,
      })
      .from(schoolManagerUsers)
      .where(eq(schoolManagerUsers.id, managerId))
      .limit(1);
    if (!record || !record.passwordHash) {
      throw new AuthenticationError('School manager account was not found.');
    }
    if (!(await argon2.verify(record.passwordHash, data.currentPassword))) {
      throw new ValidationError('رمز عبور فعلی صحیح نیست.');
    }
    const normalizedUsername = this.normalizeManagerUsername(data.newUsername);
    if (normalizedUsername === record.phoneNumber) {
      throw new ValidationError('نام کاربری نباید با شماره همراه مدیر یکسان باشد.');
    }
    if (data.newPassword === record.phoneNumber) {
      throw new ValidationError('رمز عبور نباید با شماره همراه مدیر یکسان باشد.');
    }
    if (data.newPassword.length < 8) {
      throw new ValidationError('رمز عبور جدید باید حداقل ۸ کاراکتر باشد.');
    }
    if (data.newPassword.length > 128) {
      throw new ValidationError('رمز عبور جدید بیش از حد طولانی است.');
    }
    await this.ensureSchoolManagerIdentityIsUnique(normalizedUsername, undefined, managerId);

    const [updated] = await this.db.db
      .update(schoolManagerUsers)
      .set({
        username: normalizedUsername,
        passwordHash: await argon2.hash(data.newPassword),
        mustChangeCredentials: false,
        credentialsChangedAt: new Date(),
        failedLoginCount: 0,
        lockedUntil: null,
        updatedAt: new Date(),
      })
      .where(eq(schoolManagerUsers.id, managerId))
      .returning({ id: schoolManagerUsers.id });

    await this.revokeAllSessions(managerId, 'SCHOOL_MANAGER', 'CREDENTIALS_CHANGED');
    await this.audit.record({
      actorType: 'SCHOOL_MANAGER',
      actorId: managerId,
      entityType: 'SCHOOL_MANAGER',
      entityId: managerId,
      action: 'SCHOOL_MANAGER_CREDENTIALS_CHANGED',
      ipAddress: actor?.ip,
    });
    return updated;
  }

  async getManagerAccount(managerId: string) {
    const records = await this.db.db
      .select({
        id: schoolManagerUsers.id,
        username: schoolManagerUsers.username,
        firstName: schoolManagerUsers.firstName,
        lastName: schoolManagerUsers.lastName,
        phoneNumber: schoolManagerUsers.phoneNumber,
        email: schoolManagerUsers.email,
        status: schoolManagerUsers.status,
        mustChangeCredentials: schoolManagerUsers.mustChangeCredentials,
        credentialsChangedAt: schoolManagerUsers.credentialsChangedAt,
        lastLoginAt: schoolManagerUsers.lastLoginAt,
        createdAt: schoolManagerUsers.createdAt,
      })
      .from(schoolManagerUsers)
      .where(eq(schoolManagerUsers.id, managerId))
      .limit(1);
    if (!records[0]) throw new ValidationError('School manager was not found.');
    return records[0];
  }

  async getPrincipal(reqUser: { id: string; role: UserRole; sessionId: string }) {
    const principal: Record<string, unknown> = { ...reqUser };
    if (reqUser.role === 'SCHOOL_MANAGER') {
      const [record] = await this.db.db
        .select({ mustChangeCredentials: schoolManagerUsers.mustChangeCredentials })
        .from(schoolManagerUsers)
        .where(eq(schoolManagerUsers.id, reqUser.id))
        .limit(1);
      principal.mustChangeCredentials = record?.mustChangeCredentials ?? true;
    }
    return principal;
  }

  private normalizeManagerUsername(value: string): string {
    return normalizeIranianDigits(value.trim());
  }

  private async ensureSchoolManagerIdentityIsUnique(
    username: string,
    phoneNumber?: string,
    excludedManagerId?: string,
  ) {
    const conditions = [eq(schoolManagerUsers.username, username)];
    if (phoneNumber) conditions.push(eq(schoolManagerUsers.phoneNumber, phoneNumber));
    const matches = await this.db.db
      .select({ id: schoolManagerUsers.id })
      .from(schoolManagerUsers)
      .where(or(...conditions));
    if (matches.some(({ id }) => id !== excludedManagerId)) {
      throw new ValidationError(
        'A school manager with this username or phone number already exists.',
      );
    }
  }

  async verifyAdminOtp(
    challengeId: string,
    code: string,
    context?: SessionContext,
    rememberMe = false,
  ): Promise<LoginResult> {
    const genericError = () => new AuthenticationError('The username or password is incorrect.');
    const challengeHash = this.hashToken(challengeId);

    const result = await this.db.db.transaction(async (txn) => {
      await txn.execute(
        sql`select pg_advisory_xact_lock(hashtext(${`admin-challenge:${challengeHash}`}))`,
      );
      const [challenge] = await txn
        .select()
        .from(adminAuthChallenges)
        .where(eq(adminAuthChallenges.challengeHash, challengeHash))
        .limit(1);
      if (!challenge || challenge.usedAt || challenge.invalidatedAt) {
        return { outcome: 'NOT_FOUND' as const };
      }
      if (isPast(new Date(challenge.expiresAt))) {
        await txn
          .update(adminAuthChallenges)
          .set({ invalidatedAt: new Date() })
          .where(eq(adminAuthChallenges.id, challenge.id));
        return { outcome: 'EXPIRED' as const };
      }
      if (challenge.attemptCount >= challenge.maxAttempts) {
        return { outcome: 'TOO_MANY_ATTEMPTS' as const };
      }

      const admins = await txn
        .select({
          id: adminUsers.id,
          username: adminUsers.username,
          phoneNumber: adminUsers.phoneNumber,
          status: adminUsers.status,
        })
        .from(adminUsers)
        .where(eq(adminUsers.id, challenge.adminId))
        .limit(1);
      const adminRecord = admins[0];
      if (!adminRecord || adminRecord.status !== 'ACTIVE') {
        throw genericError();
      }

      const otpOutcome = await this.consumeOtpInTransaction(
        txn,
        adminRecord.phoneNumber,
        'AUTH_ADMIN',
        code,
      );
      if (otpOutcome !== 'VERIFIED') {
        const attempts = challenge.attemptCount + 1;
        await txn
          .update(adminAuthChallenges)
          .set({
            attemptCount: attempts,
            invalidatedAt: attempts >= challenge.maxAttempts ? new Date() : null,
          })
          .where(eq(adminAuthChallenges.id, challenge.id));
        return { outcome: otpOutcome };
      }

      await txn
        .update(adminAuthChallenges)
        .set({ usedAt: new Date() })
        .where(eq(adminAuthChallenges.id, challenge.id));
      return {
        outcome: 'VERIFIED' as const,
        admin: {
          id: adminRecord.id,
          username: adminRecord.username,
          phoneNumber: adminRecord.phoneNumber,
        },
      };
    });

    if (result.outcome === 'NOT_FOUND') {
      throw new AppError(
        'OTP_REQUEST_MISSING',
        'درخواست کد تأیید معتبر نیست یا با کد جدید جایگزین شده است. دوباره کد بگیرید.',
        400,
      );
    }
    if (result.outcome === 'EXPIRED') {
      throw new AppError(
        'OTP_EXPIRED',
        'زمان اعتبار کد تأیید به پایان رسیده است. کد جدید بگیرید.',
        400,
      );
    }
    if (result.outcome === 'TOO_MANY_ATTEMPTS') {
      throw new AppError(
        'OTP_ATTEMPTS_EXCEEDED',
        'تعداد تلاش‌های ناموفق بیش از حد مجاز است. کد جدید دریافت کنید.',
        429,
      );
    }
    if (result.outcome === 'INVALID') {
      throw new AppError('OTP_INVALID', 'کد تأیید واردشده صحیح نیست.', 400);
    }
    if (!result.admin) throw genericError();
    const admin = result.admin;
    await this.db.db
      .update(adminUsers)
      .set({ lastLoginAt: new Date() })
      .where(eq(adminUsers.id, admin.id));
    const tokens = await this.generateTokens(admin.id, 'ADMIN', context, undefined, rememberMe);
    this.logger.log('Admin logged in after two-factor verification.');
    return { user: { ...admin, role: 'ADMIN' }, ...tokens };
  }

  async refreshTokens(
    refreshToken: string,
  ): Promise<AuthTokens & { role: 'PARENT' | 'ADMIN' | 'SCHOOL_MANAGER'; remembered: boolean }> {
    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(refreshToken, {
        secret: this.config.jwtSecret,
      });

      if (
        payload.type !== 'refresh' ||
        !['PARENT', 'ADMIN', 'SCHOOL_MANAGER'].includes(payload.role)
      ) {
        throw new AuthenticationError('Invalid refresh token.');
      }

      const session = await this.db.db
        .select()
        .from(authSessions)
        .where(eq(authSessions.id, payload.sid))
        .limit(1);
      const tokenHash = this.hashToken(refreshToken);
      const current = session[0];

      if (
        !current ||
        current.subjectId !== payload.sub ||
        current.role !== payload.role ||
        current.refreshTokenHash !== tokenHash ||
        current.revokedAt
      ) {
        if (current && !current.revokedAt) {
          await this.revokeAllSessions(payload.sub, payload.role, 'REFRESH_TOKEN_REUSE');
        }
        throw new AuthenticationError('Invalid or expired refresh token.');
      }
      if (isPast(new Date(current.expiresAt))) {
        await this.revokeSession(current.id, 'SESSION_EXPIRED');
        throw new AuthenticationError('Invalid or expired refresh token.');
      }

      const account = await this.findAccountById(payload.sub, payload.role);
      if (!account || account.status !== 'ACTIVE') {
        await this.revokeAllSessions(payload.sub, payload.role, 'ACCOUNT_DISABLED');
        throw new AuthenticationError('Invalid or expired refresh token.');
      }

      const tokens = await this.generateTokens(
        payload.sub,
        payload.role,
        undefined,
        current.id,
        current.remembered,
      );
      return { ...tokens, role: payload.role, remembered: current.remembered };
    } catch (err: any) {
      if (err instanceof AuthenticationError) throw err;
      throw new AuthenticationError('Invalid or expired refresh token.');
    }
  }

  async logout(userId: string, sessionId: string): Promise<void> {
    const session = await this.db.db
      .select({ subjectId: authSessions.subjectId })
      .from(authSessions)
      .where(eq(authSessions.id, sessionId))
      .limit(1);
    if (session[0]?.subjectId === userId) await this.revokeSession(sessionId, 'LOGOUT');
    this.logger.log('User logged out.');
  }

  async sendOtp(phoneNumber: string, purpose: string, requestIp?: string): Promise<OtpResult> {
    const created = await this.db.db.transaction(async (txn) => {
      await txn.execute(
        sql`select pg_advisory_xact_lock(hashtext(${`otp:${phoneNumber}:${purpose}`}))`,
      );
      if (requestIp) {
        await txn.execute(sql`select pg_advisory_xact_lock(hashtext(${`otp-ip:${requestIp}`}))`);
        const recentFromIp = await txn
          .select({ id: otpRequests.id })
          .from(otpRequests)
          .where(
            and(
              eq(otpRequests.requestIp, requestIp),
              gt(otpRequests.createdAt, new Date(Date.now() - 60_000)),
            ),
          );
        if (recentFromIp.length >= 10) {
          this.metrics?.recordMessage('otp', 'rate_limited');
          throw new AppError(
            'OTP_RATE_LIMIT',
            'تعداد درخواست‌های کد تأیید بیش از حد مجاز است. کمی بعد دوباره تلاش کنید.',
            429,
          );
        }
      }
      const recent = await txn
        .select()
        .from(otpRequests)
        .where(
          and(
            eq(otpRequests.phoneNumber, phoneNumber),
            eq(otpRequests.purpose, purpose),
            isNull(otpRequests.verifiedAt),
            isNull(otpRequests.invalidatedAt),
          ),
        )
        .orderBy(desc(otpRequests.createdAt))
        .limit(1);
      if (recent[0]) {
        const elapsed = (Date.now() - new Date(recent[0].createdAt).getTime()) / 1000;
        if (elapsed < this.config.otpResendCooldownSeconds) {
          this.metrics?.recordMessage('otp', 'rate_limited');
          throw new AppError(
            'OTP_RESEND_COOLDOWN',
            `برای دریافت کد جدید ${Math.ceil(this.config.otpResendCooldownSeconds - elapsed)} ثانیه صبر کنید.`,
            429,
          );
        }
      }
      await txn
        .update(otpRequests)
        .set({ invalidatedAt: new Date() })
        .where(
          and(
            eq(otpRequests.phoneNumber, phoneNumber),
            eq(otpRequests.purpose, purpose),
            isNull(otpRequests.verifiedAt),
            isNull(otpRequests.invalidatedAt),
          ),
        );
      const code = randomInt(100000, 1000000).toString();
      const expiresAt = addSeconds(new Date(), this.config.otpExpirySeconds);
      const id = generateId();
      await txn.insert(otpRequests).values({
        id,
        phoneNumber,
        purpose,
        codeHash: await argon2.hash(code),
        expiresAt,
        maxAttempts: this.config.otpMaxAttempts,
        requestIp: requestIp || null,
      });
      return { id, code, expiresAt };
    });

    const deliveryStartedAt = performance.now();
    try {
      await this.otpDelivery.send({ phoneNumber, purpose, code: created.code });
      this.metrics?.recordMessage(
        'otp',
        'accepted',
        (performance.now() - deliveryStartedAt) / 1_000,
      );
    } catch (error) {
      const outcome =
        error instanceof Error && 'providerStatus' in error && error.providerStatus === 408
          ? 'timeout'
          : error instanceof Error && 'transient' in error && error.transient === false
            ? 'permanent_failure'
            : 'transient_failure';
      this.metrics?.recordMessage('otp', outcome, (performance.now() - deliveryStartedAt) / 1_000);
      if (outcome === 'permanent_failure') this.metrics?.recordMessage('otp', 'rejected');
      await this.db.db
        .update(otpRequests)
        .set({ invalidatedAt: new Date() })
        .where(eq(otpRequests.id, created.id));
      throw error;
    }
    this.logger.log(`OTP sent for ${purpose}.`);

    return {
      expiresAt: created.expiresAt,
      cooldownSeconds: this.config.otpResendCooldownSeconds,
      developmentCode:
        this.config.nodeEnv !== 'production' && this.config.otpProvider === 'console'
          ? created.code
          : undefined,
    };
  }

  async verifyOtp(
    phoneNumber: string,
    purpose: string,
    code: string,
  ): Promise<{ userId?: string }> {
    const outcome = await this.db.db.transaction(async (txn) => {
      await txn.execute(
        sql`select pg_advisory_xact_lock(hashtext(${`otp:${phoneNumber}:${purpose}`}))`,
      );
      return this.consumeOtpInTransaction(txn, phoneNumber, purpose, code);
    });
    if (outcome === 'NOT_FOUND') {
      throw new AppError(
        'OTP_REQUEST_MISSING',
        'درخواست کد تأیید معتبر نیست یا با کد جدید جایگزین شده است. دوباره کد بگیرید.',
        400,
      );
    }
    if (outcome === 'TOO_MANY_ATTEMPTS') {
      this.metrics?.recordMessage('otp', 'rate_limited');
      throw new AppError(
        'OTP_ATTEMPTS_EXCEEDED',
        'تعداد تلاش‌های ناموفق بیش از حد مجاز است. کد جدید دریافت کنید.',
        429,
      );
    }
    if (outcome === 'EXPIRED') {
      throw new AppError(
        'OTP_EXPIRED',
        'زمان اعتبار کد تأیید به پایان رسیده است. کد جدید بگیرید.',
        400,
      );
    }
    if (outcome === 'INVALID') {
      throw new AppError('OTP_INVALID', 'کد تأیید واردشده صحیح نیست.', 400);
    }

    this.logger.log(`OTP verified for ${purpose}.`);
    return {};
  }

  private async consumeOtpInTransaction(
    txn: any,
    phoneNumber: string,
    purpose: string,
    code: string,
  ): Promise<'NOT_FOUND' | 'TOO_MANY_ATTEMPTS' | 'EXPIRED' | 'INVALID' | 'VERIFIED'> {
    const [request] = await txn
      .select()
      .from(otpRequests)
      .where(
        and(
          eq(otpRequests.phoneNumber, phoneNumber),
          eq(otpRequests.purpose, purpose),
          isNull(otpRequests.verifiedAt),
          isNull(otpRequests.invalidatedAt),
        ),
      )
      .orderBy(desc(otpRequests.createdAt))
      .limit(1);
    if (!request) {
      return 'NOT_FOUND' as const;
    }
    if (request.attemptCount >= request.maxAttempts) {
      return 'TOO_MANY_ATTEMPTS' as const;
    }
    if (new Date(request.expiresAt).getTime() <= Date.now()) {
      await txn
        .update(otpRequests)
        .set({ invalidatedAt: new Date() })
        .where(eq(otpRequests.id, request.id));
      return 'EXPIRED' as const;
    }
    const valid = await argon2.verify(request.codeHash, code);
    const attemptCount = request.attemptCount + 1;
    if (!valid) {
      await txn
        .update(otpRequests)
        .set({
          attemptCount,
          invalidatedAt: attemptCount >= request.maxAttempts ? new Date() : null,
        })
        .where(eq(otpRequests.id, request.id));
      this.logger.warn(`Failed OTP attempt for ${purpose}.`);
      return 'INVALID' as const;
    }
    await txn
      .update(otpRequests)
      .set({ verifiedAt: new Date(), attemptCount })
      .where(and(eq(otpRequests.id, request.id), isNull(otpRequests.verifiedAt)));
    return 'VERIFIED' as const;
  }

  private async findAccountByPhone(
    phoneNumber: string,
    _role: 'PARENT' = 'PARENT',
  ): Promise<{ id: string; username: string; status: string } | undefined> {
    const direct = await this.db.db
      .select({ id: users.id, username: users.username, status: users.accountStatus })
      .from(users)
      .where(eq(users.phoneNumber, phoneNumber))
      .limit(1);
    if (direct[0]) return direct[0];

    // Compatibility for accounts created before users.phone_number existed.
    const legacy = await this.db.db
      .select({ id: users.id, username: users.username, status: users.accountStatus })
      .from(parents)
      .innerJoin(users, eq(parents.userId, users.id))
      .where(eq(parents.phoneNumber, phoneNumber))
      .limit(1);
    return legacy[0];
  }

  private async findAccountById(userId: string, role: 'PARENT' | 'ADMIN' | 'SCHOOL_MANAGER') {
    if (role === 'ADMIN') {
      return (
        await this.db.db
          .select({ status: adminUsers.status })
          .from(adminUsers)
          .where(eq(adminUsers.id, userId))
          .limit(1)
      )[0];
    }
    if (role === 'SCHOOL_MANAGER') {
      return (
        await this.db.db
          .select({ status: schoolManagerUsers.status })
          .from(schoolManagerUsers)
          .where(eq(schoolManagerUsers.id, userId))
          .limit(1)
      )[0];
    }
    return (
      await this.db.db
        .select({ status: users.accountStatus })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1)
    )[0];
  }

  private async generateTokens(
    userId: string,
    role: 'PARENT' | 'ADMIN' | 'SCHOOL_MANAGER',
    context?: SessionContext,
    replacedSessionId?: string,
    rememberMe = false,
  ): Promise<AuthTokens> {
    // SCHOOL_MANAGER intentionally uses the standard (non-platform-admin) TTLs.
    const isAdmin = role === 'ADMIN';
    const accessTtl = isAdmin ? this.config.adminJwtAccessTokenTtl : this.config.jwtAccessTokenTtl;
    const refreshTtl = rememberMe
      ? isAdmin
        ? this.config.adminJwtRememberRefreshTokenTtl
        : this.config.jwtRememberRefreshTokenTtl
      : isAdmin
        ? this.config.adminJwtRefreshTokenTtl
        : this.config.jwtRefreshTokenTtl;

    const sessionId = generateId();
    const accessPayload: JwtPayload = { sub: userId, role, type: 'access', sid: sessionId };
    const refreshPayload: JwtPayload = { sub: userId, role, type: 'refresh', sid: sessionId };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(accessPayload, {
        expiresIn: accessTtl,
        secret: this.config.jwtSecret,
      }),
      this.jwtService.signAsync(refreshPayload, {
        expiresIn: refreshTtl,
        secret: this.config.jwtSecret,
      }),
    ]);

    await this.db.db.transaction(async (txn) => {
      if (replacedSessionId) {
        const claimed = await txn
          .update(authSessions)
          .set({
            revokedAt: new Date(),
            revocationReason: 'ROTATED',
            replacedBySessionId: sessionId,
            lastUsedAt: new Date(),
          })
          .where(and(eq(authSessions.id, replacedSessionId), isNull(authSessions.revokedAt)))
          .returning({ id: authSessions.id });
        if (!claimed[0]) throw new AuthenticationError('Invalid or expired refresh token.');
      }
      await txn.insert(authSessions).values({
        id: sessionId,
        subjectId: userId,
        role,
        refreshTokenHash: this.hashToken(refreshToken),
        deviceName: context?.deviceName || null,
        ipAddress: context?.ipAddress || null,
        userAgent: context?.userAgent || null,
        remembered: rememberMe,
        expiresAt: addSeconds(new Date(), refreshTtl),
      });
    });

    return { accessToken, refreshToken };
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private async revokeSession(sessionId: string, reason: string): Promise<void> {
    await this.db.db
      .update(authSessions)
      .set({ revokedAt: new Date(), revocationReason: reason })
      .where(and(eq(authSessions.id, sessionId), isNull(authSessions.revokedAt)));
  }

  private async revokeAllSessions(
    subjectId: string,
    role: 'PARENT' | 'ADMIN' | 'SCHOOL_MANAGER',
    reason: string,
  ): Promise<void> {
    await this.db.db
      .update(authSessions)
      .set({ revokedAt: new Date(), revocationReason: reason })
      .where(
        and(
          eq(authSessions.subjectId, subjectId),
          eq(authSessions.role, role),
          isNull(authSessions.revokedAt),
        ),
      );
  }
}

type SessionContext = {
  deviceName?: string;
  ipAddress?: string;
  userAgent?: string;
};
