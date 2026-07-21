import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { addSeconds, isPast } from 'date-fns';
import { eq, and, isNull } from 'drizzle-orm';
import { ConfigService } from '../../../config/config.service';
import { DatabaseService } from '../../../database/database.service';
import { users, adminUsers, otpRequests, parents } from '../../../database/schemas';
import {
  AuthenticationError,
  ConflictError,
  NotFoundError,
  ValidationError,
} from '../../../common/errors';
import { generateId } from '../../../common/utils';
import { AppLogger } from '../../../common/logger';
import { AuthTokens, LoginResult, OtpResult } from '../domain/auth.types';
import { JwtPayload } from '../../../common/authentication.types';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly db: DatabaseService,
    private readonly logger: AppLogger,
  ) {}

  async registerParent(username: string, password: string): Promise<{ userId: string }> {
    this.validatePassword(password, false);

    const existing = await this.db.db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.username, username))
      .limit(1);

    if (existing.length > 0) {
      throw new ConflictError('DUPLICATE_USERNAME', 'This username is already taken.');
    }

    const passwordHash = await argon2.hash(password);
    const userId = generateId();

    await this.db.db.insert(users).values({
      id: userId,
      username,
      passwordHash,
      accountStatus: 'ACTIVE',
    });

    this.logger.log('Parent registered.');
    return { userId };
  }

  async registerAdmin(data: {
    username: string;
    password: string;
    firstName: string;
    lastName: string;
    phoneNumber: string;
  }): Promise<{ adminId: string }> {
    this.validatePassword(data.password, true);

    const existing = await this.db.db
      .select({ id: adminUsers.id })
      .from(adminUsers)
      .where(eq(adminUsers.username, data.username))
      .limit(1);

    if (existing.length > 0) {
      throw new ConflictError('DUPLICATE_USERNAME', 'This username is already taken.');
    }

    const passwordHash = await argon2.hash(data.password);
    const adminId = generateId();

    await this.db.db.insert(adminUsers).values({
      id: adminId,
      username: data.username,
      passwordHash,
      firstName: data.firstName,
      lastName: data.lastName,
      phoneNumber: data.phoneNumber,
    });

    this.logger.log('Admin registered.');
    return { adminId };
  }

  async loginParent(username: string, password: string): Promise<LoginResult> {
    const user = await this.db.db.select().from(users).where(eq(users.username, username)).limit(1);

    if (user.length === 0) {
      throw new AuthenticationError();
    }

    const valid = await argon2.verify(user[0].passwordHash, password);
    if (!valid) {
      this.logger.warn('Failed parent login attempt.');
      throw new AuthenticationError();
    }

    if (user[0].accountStatus !== 'ACTIVE') {
      throw new AuthenticationError('Account is disabled or suspended.');
    }

    await this.db.db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user[0].id));

    const tokens = await this.generateTokens(user[0].id, 'PARENT');
    this.logger.log('Parent logged in.');

    return {
      user: { id: user[0].id, username: user[0].username, role: 'PARENT' },
      ...tokens,
    };
  }

  async loginAdmin(username: string, password: string): Promise<LoginResult> {
    const admin = await this.db.db
      .select()
      .from(adminUsers)
      .where(eq(adminUsers.username, username))
      .limit(1);

    if (admin.length === 0) {
      throw new AuthenticationError();
    }

    const valid = await argon2.verify(admin[0].passwordHash, password);
    if (!valid) {
      this.logger.warn('Failed admin login attempt.');
      throw new AuthenticationError();
    }

    if (admin[0].status !== 'ACTIVE') {
      throw new AuthenticationError('Account is disabled or suspended.');
    }

    await this.db.db
      .update(adminUsers)
      .set({ lastLoginAt: new Date() })
      .where(eq(adminUsers.id, admin[0].id));

    const tokens = await this.generateTokens(admin[0].id, 'ADMIN');
    this.logger.log('Admin logged in.');

    return {
      user: { id: admin[0].id, username: admin[0].username, role: 'ADMIN' },
      ...tokens,
    };
  }

  async refreshTokens(refreshToken: string, expectedRole: 'PARENT' | 'ADMIN'): Promise<AuthTokens> {
    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(refreshToken, {
        secret: this.config.jwtSecret,
      });

      if (payload.type !== 'refresh' || payload.role !== expectedRole) {
        throw new AuthenticationError('Invalid refresh token.');
      }

      return this.generateTokens(payload.sub, payload.role);
    } catch (err: any) {
      if (err instanceof AuthenticationError) throw err;
      throw new AuthenticationError('Invalid or expired refresh token.');
    }
  }

  async logout(_userId: string): Promise<void> {
    this.logger.log('User logged out.');
  }

  async changePassword(
    userId: string,
    role: 'PARENT' | 'ADMIN',
    oldPassword: string,
    newPassword: string,
  ): Promise<void> {
    this.validatePassword(newPassword, role === 'ADMIN');

    const table = role === 'PARENT' ? users : adminUsers;
    const records = await this.db.db.select().from(table).where(eq(table.id, userId)).limit(1);

    if (records.length === 0) throw new NotFoundError('User');

    const valid = await argon2.verify(records[0].passwordHash, oldPassword);
    if (!valid) throw new AuthenticationError('Current password is incorrect.');

    const newHash = await argon2.hash(newPassword);
    await this.db.db
      .update(table)
      .set({ passwordHash: newHash, updatedAt: new Date() })
      .where(eq(table.id, userId));

    this.logger.log('User password changed.');
  }

  async forgotPassword(phoneNumber: string): Promise<OtpResult> {
    const parent = await this.db.db
      .select()
      .from(parents)
      .where(eq(parents.phoneNumber, phoneNumber))
      .limit(1);

    if (parent.length === 0) {
      return { expiresAt: new Date(), cooldownSeconds: this.config.otpResendCooldownSeconds };
    }

    return this.sendOtp(phoneNumber, 'PASSWORD_RECOVERY');
  }

  async resetPassword(phoneNumber: string, code: string, newPassword: string): Promise<void> {
    this.validatePassword(newPassword, false);

    await this.verifyOtp(phoneNumber, 'PASSWORD_RECOVERY', code);

    const parentRecords = await this.db.db
      .select()
      .from(parents)
      .where(eq(parents.phoneNumber, phoneNumber))
      .limit(1);

    if (parentRecords.length === 0) throw new NotFoundError('Parent');

    const parent = parentRecords[0];
    const userRecords = await this.db.db
      .select()
      .from(users)
      .where(eq(users.id, parent.userId))
      .limit(1);

    if (userRecords.length === 0) throw new NotFoundError('User');

    const newHash = await argon2.hash(newPassword);
    await this.db.db
      .update(users)
      .set({ passwordHash: newHash, updatedAt: new Date() })
      .where(eq(users.id, parent.userId));

    this.logger.log('User password reset completed.');
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
      .orderBy(otpRequests.createdAt)
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

    this.logger.log(`OTP sent for ${purpose}.`);

    await this.db.db.insert(otpRequests).values({
      id: generateId(),
      phoneNumber,
      purpose,
      codeHash,
      expiresAt,
      maxAttempts: this.config.otpMaxAttempts,
    });

    return { expiresAt, cooldownSeconds: this.config.otpResendCooldownSeconds };
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
      .orderBy(otpRequests.createdAt)
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

  private async generateTokens(userId: string, role: 'PARENT' | 'ADMIN'): Promise<AuthTokens> {
    const accessTtl =
      role === 'ADMIN' ? this.config.adminJwtAccessTokenTtl : this.config.jwtAccessTokenTtl;
    const refreshTtl =
      role === 'ADMIN' ? this.config.adminJwtRefreshTokenTtl : this.config.jwtRefreshTokenTtl;

    const accessPayload: JwtPayload = { sub: userId, role, type: 'access' };
    const refreshPayload: JwtPayload = { sub: userId, role, type: 'refresh' };

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

    return { accessToken, refreshToken };
  }

  private validatePassword(password: string, isAdmin: boolean): void {
    const minLen = isAdmin ? 12 : 8;
    if (password.length < minLen) {
      throw new ValidationError(`Password must be at least ${minLen} characters.`);
    }
    if (password.length > 128) {
      throw new ValidationError('Password must not exceed 128 characters.');
    }
    if (!/[a-zA-Z]/.test(password)) {
      throw new ValidationError('Password must contain at least one letter.');
    }
    if (!/[0-9]/.test(password)) {
      throw new ValidationError('Password must contain at least one number.');
    }
    if (isAdmin && !/[^a-zA-Z0-9]/.test(password)) {
      throw new ValidationError('Admin password must contain at least one symbol.');
    }
  }
}
