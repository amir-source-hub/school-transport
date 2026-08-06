import { Inject, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { addSeconds, isPast } from 'date-fns';
import { eq, and, desc, isNull, or, gt, sql } from 'drizzle-orm';
import { createHash, randomInt } from 'node:crypto';
import { ConfigService } from '../../../config/config.service';
import { DatabaseService } from '../../../database/database.service';
import { users, adminUsers, otpRequests, parents, authSessions } from '../../../database/schemas';
import { AuthenticationError, ValidationError } from '../../../common/errors';
import { generateId } from '../../../common/utils';
import { AppLogger } from '../../../common/logger';
import { AuthTokens, LoginResult, OtpResult } from '../domain/auth.types';
import { JwtPayload } from '../../../common/authentication.types';
import { OTP_DELIVERY, OtpDelivery } from './otp-delivery.port';
import { InAppNotificationService } from '../../../infrastructure/notifications/in-app-notification.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly db: DatabaseService,
    private readonly logger: AppLogger,
    @Inject(OTP_DELIVERY) private readonly otpDelivery: OtpDelivery,
    private readonly notifications: InAppNotificationService,
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
      .orderBy(desc(adminUsers.createdAt));
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
  }) {
    await this.ensureAdminIdentityIsUnique(data.username, data.phoneNumber);
    const [admin] = await this.db.db
      .insert(adminUsers)
      .values({ id: generateId(), ...data, email: data.email || null, status: 'ACTIVE' })
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
    }>,
  ) {
    const current = await this.getAdmin(adminId);
    await this.ensureAdminIdentityIsUnique(
      data.username ?? current.username,
      data.phoneNumber ?? current.phoneNumber,
      adminId,
    );
    const changes = {
      ...data,
      ...(data.email !== undefined ? { email: data.email || null } : {}),
      updatedAt: new Date(),
    };
    const [admin] = await this.db.db
      .update(adminUsers)
      .set(changes)
      .where(eq(adminUsers.id, adminId))
      .returning();
    return admin;
  }

  async setAdminStatus(adminId: string, status: 'ACTIVE' | 'INACTIVE') {
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
    role: 'PARENT' | 'ADMIN',
    requestIp?: string,
  ): Promise<OtpResult> {
    const account = await this.findAccountByPhone(phoneNumber, role);
    // Admin accounts must be provisioned in advance. Keep production responses generic.
    if (role === 'ADMIN' && !account) {
      const result: OtpResult = {
        expiresAt: addSeconds(new Date(), this.config.otpExpirySeconds),
        cooldownSeconds: this.config.otpResendCooldownSeconds,
      };
      if (this.config.nodeEnv !== 'production' && this.config.otpProvider === 'console') {
        result.accountExists = false;
      }
      return result;
    }
    return this.sendOtp(phoneNumber, role === 'ADMIN' ? 'AUTH_ADMIN' : 'AUTH_PARENT', requestIp);
  }

  async verifyAuthOtp(
    phoneNumber: string,
    code: string,
    role: 'PARENT' | 'ADMIN',
    context?: SessionContext,
  ): Promise<LoginResult> {
    let account = await this.findAccountByPhone(phoneNumber, role);
    if (role === 'ADMIN' && !account) {
      throw new AuthenticationError('Invalid phone number or verification code.');
    }
    await this.verifyOtp(phoneNumber, role === 'ADMIN' ? 'AUTH_ADMIN' : 'AUTH_PARENT', code);

    if (!account) {
      const userId = generateId();
      await this.db.db.transaction(async (txn) => {
        await txn.insert(users).values({
          id: userId,
          username: phoneNumber,
          phoneNumber,
          accountStatus: 'ACTIVE',
        });
        await this.notifications.enqueueInTransaction(txn, {
          eventId: `ACCOUNT_REGISTERED:${userId}`,
          userId,
          notificationType: 'ACCOUNT_REGISTERED',
          title: 'ثبت‌نام حساب با موفقیت انجام شد',
          message: 'حساب خانواده ایجاد شد. اکنون اطلاعات خانواده و دانش‌آموز قابل ثبت است.',
          relatedEntityType: 'USER',
          relatedEntityId: userId,
        });
      });
      account = { id: userId, username: phoneNumber, status: 'ACTIVE' };
      this.logger.log('Parent account created after OTP verification.');
    }

    if (account.status !== 'ACTIVE') {
      throw new AuthenticationError('Account is disabled or suspended.');
    }
    if (role === 'PARENT') {
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
    }
    const table = role === 'ADMIN' ? adminUsers : users;
    await this.db.db.update(table).set({ lastLoginAt: new Date() }).where(eq(table.id, account.id));
    const tokens = await this.generateTokens(account.id, role, context);
    this.logger.log(`${role} logged in with OTP.`);
    return {
      user: { id: account.id, username: account.username, phoneNumber, role },
      ...tokens,
    };
  }

  async refreshTokens(refreshToken: string): Promise<AuthTokens & { role: 'PARENT' | 'ADMIN' }> {
    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(refreshToken, {
        secret: this.config.jwtSecret,
      });

      if (payload.type !== 'refresh' || !['PARENT', 'ADMIN'].includes(payload.role)) {
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

      const tokens = await this.generateTokens(payload.sub, payload.role, undefined, current.id);
      return { ...tokens, role: payload.role };
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
          throw new ValidationError('Too many verification codes requested. Please try later.');
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
          throw new ValidationError(
            `Please wait ${Math.ceil(this.config.otpResendCooldownSeconds - elapsed)} seconds before requesting a new code.`,
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

    try {
      await this.otpDelivery.send({ phoneNumber, purpose, code: created.code });
    } catch (error) {
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
      if (isPast(new Date(request.expiresAt))) {
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
    });
    if (outcome === 'NOT_FOUND') {
      throw new ValidationError('No valid OTP request found. Please request a new code.');
    }
    if (outcome === 'TOO_MANY_ATTEMPTS') {
      throw new ValidationError('Too many failed attempts. Please request a new code.');
    }
    if (outcome === 'EXPIRED') {
      throw new ValidationError('OTP code has expired. Please request a new code.');
    }
    if (outcome === 'INVALID') throw new ValidationError('Invalid verification code.');

    this.logger.log(`OTP verified for ${purpose}.`);
    return {};
  }

  private async findAccountByPhone(
    phoneNumber: string,
    role: 'PARENT' | 'ADMIN',
  ): Promise<{ id: string; username: string; status: string } | undefined> {
    if (role === 'ADMIN') {
      const records = await this.db.db
        .select({
          id: adminUsers.id,
          username: adminUsers.username,
          status: adminUsers.status,
        })
        .from(adminUsers)
        .where(eq(adminUsers.phoneNumber, phoneNumber))
        .limit(1);
      return records[0];
    }

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

  private async findAccountById(userId: string, role: 'PARENT' | 'ADMIN') {
    if (role === 'ADMIN') {
      return (
        await this.db.db
          .select({ status: adminUsers.status })
          .from(adminUsers)
          .where(eq(adminUsers.id, userId))
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
    role: 'PARENT' | 'ADMIN',
    context?: SessionContext,
    replacedSessionId?: string,
  ): Promise<AuthTokens> {
    const accessTtl =
      role === 'ADMIN' ? this.config.adminJwtAccessTokenTtl : this.config.jwtAccessTokenTtl;
    const refreshTtl =
      role === 'ADMIN' ? this.config.adminJwtRefreshTokenTtl : this.config.jwtRefreshTokenTtl;

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
    role: 'PARENT' | 'ADMIN',
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
