import { describe, expect, it, vi } from 'vitest';
import * as argon2 from 'argon2';
import { createHash } from 'node:crypto';
import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { OnboardingService } from './onboarding.service';
import { OnboardingGuard } from '../../access-control/onboarding.guard';
import {
  users,
  otpRequests,
  authSessions,
  onboardingSessions,
  contracts,
} from '../../../database/schemas';

function memoryDatabase() {
  const store = new Map<unknown, any[]>();
  const rows = (table: unknown) => {
    if (!store.has(table)) store.set(table, []);
    return store.get(table)!;
  };
  const select = () => ({
    from: (table: unknown) => {
      const query = {
        where: () => {
          const result: any = {
            limit: async (n: number) => rows(table).slice(0, n),
            orderBy: () => ({
              limit: async (n: number) => rows(table).slice(0, n),
            }),
          };
          result.then = (
            resolve: (value: unknown) => unknown,
            reject: (reason?: unknown) => unknown,
          ) => Promise.resolve(rows(table)).then(resolve, reject);
          return result;
        },
        innerJoin: () => query,
      };
      return query;
    },
  });
  const insert = (table: unknown) => ({
    values: (value: any) => {
      const row = { ...value };
      rows(table).push(row);
      return {
        returning: async () => [row],
        onConflictDoNothing: () => ({ returning: async () => [row] }),
      };
    },
  });
  const update = (table: unknown) => ({
    set: (changes: any) => ({
      where: async () => {
        const list = rows(table);
        if (list.length > 0) list[0] = { ...list[0], ...changes };
        return { returning: async () => (list.length > 0 ? [list[0]] : []) };
      },
    }),
  });
  const txn = {
    select,
    insert,
    update,
    execute: async () => {},
  };
  const dbObj = {
    db: {
      select,
      insert,
      update,
      transaction: async (work: (inner: any) => Promise<unknown>) => work(txn),
    },
  };
  return { store, rows, db: dbObj };
}

function config(overrides: Record<string, unknown> = {}) {
  return {
    jwtSecret: 'secret',
    jwtAccessTokenTtl: 3600,
    jwtRefreshTokenTtl: 86400,
    jwtRememberRefreshTokenTtl: 604800,
    adminJwtAccessTokenTtl: 3600,
    adminJwtRefreshTokenTtl: 86400,
    adminJwtRememberRefreshTokenTtl: 604800,
    otpExpirySeconds: 120,
    otpMaxAttempts: 5,
    otpResendCooldownSeconds: 60,
    adminChallengeTtlSeconds: 120,
    onboardingSessionTtlSeconds: 604800,
    nodeEnv: 'test',
    otpProvider: 'console',
    ...overrides,
  };
}

const logger = { log: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() };
const audit = { record: vi.fn(), recordInTransaction: vi.fn() };
const notifications = {
  enqueueInTransaction: vi.fn().mockResolvedValue(undefined),
  create: vi.fn().mockResolvedValue(undefined),
};

function verifiedOtpRow(hash: string) {
  return {
    id: 'otp-1',
    phoneNumber: '09123456789',
    purpose: 'AUTH_PARENT',
    codeHash: hash,
    expiresAt: new Date(Date.now() + 60_000),
    attemptCount: 0,
    maxAttempts: 5,
    verifiedAt: null,
    invalidatedAt: null,
    requestIp: null,
    createdAt: new Date(),
  };
}

function buildAuth(db: any) {
  const service = new AuthService(
    { signAsync: vi.fn().mockResolvedValue('signed-token') } as never,
    config() as never,
    db as never,
    logger as never,
    { send: vi.fn().mockResolvedValue(undefined) } as never,
    notifications as never,
    audit as never,
    buildOnboarding(db),
  );
  return service;
}

function buildOnboarding(db: any) {
  return new OnboardingService(db as never, config() as never, notifications as never);
}

describe('first-time onboarding after OTP', () => {
  it('creates a PENDING account and a restricted onboarding session for an unknown phone', async () => {
    const memory = memoryDatabase();
    memory.rows(otpRequests).push(verifiedOtpRow(await argon2.hash('123456')));
    const service = buildAuth(memory.db);

    const result = await service.verifyAuthOtp('09123456789', '123456', 'PARENT', undefined, true);

    expect(result.user).toBeNull();
    if (result.user !== null) return;
    expect(result.onboarding.token).toBeTruthy();
    expect(result.onboarding.expiresAt.getTime()).toBeGreaterThan(
      Date.now() + 604_800 * 1000 - 1000,
    );
    expect(memory.rows(users)[0].accountStatus).toBe('PENDING');
    expect(memory.rows(onboardingSessions)).toHaveLength(1);
    expect(memory.rows(onboardingSessions)[0].status).toBe('PENDING');
    expect(memory.rows(authSessions)).toHaveLength(0);
    expect(notifications.enqueueInTransaction).not.toHaveBeenCalled();
  });

  it('resumes the existing PENDING draft instead of creating a second account', async () => {
    const memory = memoryDatabase();
    memory.rows(otpRequests).push(verifiedOtpRow(await argon2.hash('123456')));
    memory.rows(users).push({
      id: 'user-1',
      username: '09123456789',
      phoneNumber: '09123456789',
      status: 'PENDING',
      accountStatus: 'PENDING',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    memory.rows(onboardingSessions).push({
      id: 'onboarding-1',
      phoneNumber: '09123456789',
      userId: 'user-1',
      status: 'PENDING',
      onboardingTokenHash: 'old-hash',
      verifiedAt: new Date(Date.now() - 1000),
      expiresAt: new Date(Date.now() + 1000),
      currentStep: null,
      completedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const service = buildAuth(memory.db);

    const result = await service.verifyAuthOtp('09123456789', '123456');

    expect(result.user).toBeNull();
    expect(memory.rows(users)).toHaveLength(1);
    expect(memory.rows(users)[0].id).toBe('user-1');
    expect(memory.rows(onboardingSessions)).toHaveLength(1);
    expect(memory.rows(onboardingSessions)[0].onboardingTokenHash).not.toBe('old-hash');
  });

  it('issues a full panel session after the enrollment contract is accepted', async () => {
    const memory = memoryDatabase();
    memory.rows(otpRequests).push(verifiedOtpRow(await argon2.hash('123456')));
    const service = buildAuth(memory.db);

    const verified = await service.verifyAuthOtp('09123456789', '123456');
    if (verified.user !== null) throw new Error('expected onboarding result');
    const token = verified.onboarding.token;
    memory.rows(contracts).push({
      id: 'contract-1',
      contractStatus: 'ACCEPTED',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const finalized = await service.finalizeOnboarding(token);

    expect(finalized.accessToken).toBe('signed-token');
    expect(memory.rows(users)[0].accountStatus).toBe('ACTIVE');
    expect(memory.rows(onboardingSessions)[0].status).toBe('COMPLETED');
    expect(memory.rows(authSessions)).toHaveLength(1);
    expect(notifications.enqueueInTransaction).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ notificationType: 'ACCOUNT_REGISTERED' }),
    );
  });

  it('rejects finalization before an enrollment contract is accepted', async () => {
    const memory = memoryDatabase();
    memory.rows(otpRequests).push(verifiedOtpRow(await argon2.hash('123456')));
    const service = buildAuth(memory.db);

    const verified = await service.verifyAuthOtp('09123456789', '123456');
    if (verified.user !== null) throw new Error('expected onboarding result');

    await expect(service.finalizeOnboarding(verified.onboarding.token)).rejects.toThrow(
      'contract',
    );
  });

  it('rejects finalization with an unknown or expired token', async () => {
    const memory = memoryDatabase();
    memory.rows(otpRequests).push(verifiedOtpRow(await argon2.hash('123456')));
    const service = buildAuth(memory.db);

    await expect(service.finalizeOnboarding('bogus-token')).rejects.toThrow(
      'Invalid or expired onboarding session.',
    );
  });
});

describe('OnboardingGuard', () => {
  const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');

  it('resolves a valid token into an onboarding PARENT request user', async () => {
    const memory = memoryDatabase();
    memory.rows(onboardingSessions).push({
      id: 'onboarding-1',
      phoneNumber: '09123456789',
      userId: 'user-1',
      status: 'PENDING',
      onboardingTokenHash: sha256('secret-token'),
      verifiedAt: new Date(),
      expiresAt: new Date(Date.now() + 60_000),
      currentStep: null,
      completedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const guard = new OnboardingGuard(memory.db as never);
    const request = { headers: {}, cookies: { onboarding_token: 'secret-token' } };
    const context = { switchToHttp: () => ({ getRequest: () => request }) } as never;

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect((request as any).user).toEqual({
      id: 'user-1',
      role: 'PARENT',
      sessionId: null,
    });
    expect((request as any).onboarding.phoneNumber).toBe('09123456789');
  });

  it('rejects an invalid token', async () => {
    const memory = memoryDatabase();
    const guard = new OnboardingGuard(memory.db as never);
    const request = { headers: {}, cookies: {} };
    const context = { switchToHttp: () => ({ getRequest: () => request }) } as never;

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects an expired onboarding session', async () => {
    const memory = memoryDatabase();
    memory.rows(onboardingSessions).push({
      id: 'onboarding-1',
      phoneNumber: '09123456789',
      userId: 'user-1',
      status: 'PENDING',
      onboardingTokenHash: sha256('secret-token'),
      verifiedAt: new Date(Date.now() - 1000),
      expiresAt: new Date(Date.now() - 1000),
      currentStep: null,
      completedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const guard = new OnboardingGuard(memory.db as never);
    const request = { headers: {}, cookies: { onboarding_token: 'secret-token' } };
    const context = { switchToHttp: () => ({ getRequest: () => request }) } as never;

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(UnauthorizedException);
  });
});

describe('OnboardingService cleanup', () => {
  it('marks an expired PENDING session as EXPIRED', async () => {
    const memory = memoryDatabase();
    memory.rows(onboardingSessions).push({
      id: 'expired-1',
      phoneNumber: '09120000001',
      userId: 'u1',
      status: 'PENDING',
      onboardingTokenHash: 'a',
      verifiedAt: new Date(Date.now() - 1000),
      expiresAt: new Date(Date.now() - 1000),
      currentStep: null,
      completedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const service = buildOnboarding(memory.db);

    const count = await service.expireExpired();

    expect(count).toBe(1);
    expect(memory.rows(onboardingSessions)[0].status).toBe('EXPIRED');
  });
});
