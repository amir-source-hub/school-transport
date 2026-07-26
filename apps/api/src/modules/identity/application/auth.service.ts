import { Inject, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { addSeconds, isPast } from 'date-fns';
import { eq, and, desc, isNull } from 'drizzle-orm';
import { createHash } from 'node:crypto';
import { ConfigService } from '../../../config/config.service';
import { DatabaseService } from '../../../database/database.service';
import { users, adminUsers, otpRequests, parents, authSessions } from '../../../database/schemas';
import { AuthenticationError, ValidationError } from '../../../common/errors';
import { generateId } from '../../../common/utils';
import { AppLogger } from '../../../common/logger';
import { AuthTokens, LoginResult, OtpResult } from '../domain/auth.types';
import { JwtPayload } from '../../../common/authentication.types';
import { OTP_DELIVERY, OtpDelivery } from './otp-delivery.port';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly db: DatabaseService,
    private readonly logger: AppLogger,
    @Inject(OTP_DELIVERY) private readonly otpDelivery: OtpDelivery,
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

  async setAdminStatus(adminId: string, status: 'ACTIVE' | 'INACTIVE') {
    const [admin] = await this.db.db
      .update(adminUsers)
      .set({ status, updatedAt: new Date() })
      .where(eq(adminUsers.id, adminId))
      .returning();
    if (!admin) throw new ValidationError('Administrator was not found.');
    return admin;
  }

  async requestAuthOtp(phoneNumber: string, role: 'PARENT' | 'ADMIN'): Promise<OtpResult> {
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
    return this.sendOtp(phoneNumber, role === 'ADMIN' ? 'AUTH_ADMIN' : 'AUTH_PARENT');
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
      await this.db.db.insert(users).values({
        id: userId,
        username: phoneNumber,
        phoneNumber,
        accountStatus: 'ACTIVE',
      });
      account = { id: userId, username: phoneNumber, status: 'ACTIVE' };
      this.logger.log('Parent account created after OTP verification.');
    }

    if (account.status !== 'ACTIVE') {
      throw new AuthenticationError('Account is disabled or suspended.');
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
        await this.revokeAllSessions(payload.sub, payload.role, 'REFRESH_TOKEN_REUSE');
        throw new AuthenticationError('Invalid or expired refresh token.');
      }
      if (isPast(new Date(current.expiresAt))) {
        await this.revokeSession(current.id, 'SESSION_EXPIRED');
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

  async sendOtp(phoneNumber: string, purpose: string): Promise<OtpResult> {
    const recent = await this.db.db
      .select()
      .from(otpRequests)
      .where(
        and(
          eq(otpRequests.phoneNumber, phoneNumber),
          eq(otpRequests.purpose, purpose),
          isNull(otpRequests.verifiedAt),
        ),
      )
      .orderBy(desc(otpRequests.createdAt))
      .limit(1);

    if (recent.length > 0) {
      const lastRequest = recent[0];
      const elapsed = (Date.now() - new Date(lastRequest.createdAt).getTime()) / 1000;
      if (elapsed < this.config.otpResendCooldownSeconds) {
        const waitSeconds = Math.ceil(this.config.otpResendCooldownSeconds - elapsed);
        throw new ValidationError(
          `Please wait ${waitSeconds} seconds before requesting a new code.`,
        );
      }
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const codeHash = await argon2.hash(code);
    const expiresAt = addSeconds(new Date(), this.config.otpExpirySeconds);

    await this.db.db.insert(otpRequests).values({
      id: generateId(),
      phoneNumber,
      purpose,
      codeHash,
      expiresAt,
      maxAttempts: this.config.otpMaxAttempts,
    });

    await this.otpDelivery.send({ phoneNumber, purpose, code });
    this.logger.log(`OTP sent for ${purpose}.`);

    return {
      expiresAt,
      cooldownSeconds: this.config.otpResendCooldownSeconds,
      developmentCode:
        this.config.nodeEnv !== 'production' && this.config.otpProvider === 'console'
          ? code
          : undefined,
    };
  }

  async verifyOtp(
    phoneNumber: string,
    purpose: string,
    code: string,
  ): Promise<{ userId?: string }> {
    const requests = await this.db.db
      .select()
      .from(otpRequests)
      .where(
        and(
          eq(otpRequests.phoneNumber, phoneNumber),
          eq(otpRequests.purpose, purpose),
          isNull(otpRequests.verifiedAt),
        ),
      )
      .orderBy(desc(otpRequests.createdAt))
      .limit(1);

    if (requests.length === 0) {
      throw new ValidationError('No valid OTP request found. Please request a new code.');
    }

    const request = requests[0];

    if (request.attemptCount >= request.maxAttempts) {
      throw new ValidationError('Too many failed attempts. Please request a new code.');
    }

    if (isPast(new Date(request.expiresAt))) {
      throw new ValidationError('OTP code has expired. Please request a new code.');
    }

    const valid = await argon2.verify(request.codeHash, code);
    if (!valid) {
      await this.db.db
        .update(otpRequests)
        .set({ attemptCount: request.attemptCount + 1 })
        .where(eq(otpRequests.id, request.id));
      this.logger.warn(`Failed OTP attempt for ${purpose}.`);
      throw new ValidationError('Invalid verification code.');
    }

    await this.db.db
      .update(otpRequests)
      .set({ verifiedAt: new Date(), attemptCount: request.attemptCount + 1 })
      .where(eq(otpRequests.id, request.id));

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
      if (replacedSessionId) {
        await txn
          .update(authSessions)
          .set({
            revokedAt: new Date(),
            revocationReason: 'ROTATED',
            replacedBySessionId: sessionId,
            lastUsedAt: new Date(),
          })
          .where(and(eq(authSessions.id, replacedSessionId), isNull(authSessions.revokedAt)));
      }
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
