import { afterEach, describe, expect, it, vi } from 'vitest';
import * as argon2 from 'argon2';
import { createHash } from 'node:crypto';
import { AuthService } from './auth.service';
import {
  adminUsers,
  adminAuthChallenges,
  otpRequests,
  authSessions,
} from '../../../database/schemas';

type OtpRow = {
  id: string;
  phoneNumber: string;
  purpose: string;
  codeHash: string;
  expiresAt: Date;
  attemptCount: number;
  maxAttempts: number;
  verifiedAt: Date | null;
  invalidatedAt: Date | null;
  requestIp: string | null;
  createdAt: Date;
};

function otpDatabase(initial: OtpRow[] = []) {
  const rows = initial;
  let tail = Promise.resolve();
  const transaction = async <T>(work: (txn: any) => Promise<T>) => {
    let release!: () => void;
    const previous = tail;
    tail = new Promise<void>((resolve) => (release = resolve));
    let locked = false;
    const txn = {
      execute: async () => {
        if (!locked) {
          await previous;
          locked = true;
        }
      },
      select: () => ({
        from: () => ({
          where: () => ({
            orderBy: () => ({
              limit: async () =>
                rows
                  .filter((row) => !row.verifiedAt && !row.invalidatedAt)
                  .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
                  .slice(0, 1),
            }),
          }),
        }),
      }),
      insert: () => ({
        values: async (value: any) => {
          rows.push({
            ...value,
            attemptCount: 0,
            verifiedAt: null,
            invalidatedAt: null,
            createdAt: new Date(),
          });
        },
      }),
      update: () => ({
        set: (changes: Partial<OtpRow>) => ({
          where: async () => {
            const active = rows.filter((row) => !row.verifiedAt && !row.invalidatedAt);
            for (const row of active) Object.assign(row, changes);
          },
        }),
      }),
    };
    try {
      return await work(txn);
    } finally {
      if (locked) release();
    }
  };
  return {
    rows,
    service: {
      db: {
        transaction,
        update: txnUpdate(rows),
      },
    },
  };
}

function txnUpdate(rows: OtpRow[]) {
  return () => ({
    set: (changes: Partial<OtpRow>) => ({
      where: async () => {
        const active = rows.find((row) => !row.verifiedAt && !row.invalidatedAt);
        if (active) Object.assign(active, changes);
      },
    }),
  });
}

function createService(database: ReturnType<typeof otpDatabase>['service']) {
  const delivery = { send: vi.fn().mockResolvedValue(undefined) };
  const config = {
    otpExpirySeconds: 120,
    otpResendCooldownSeconds: 60,
    otpMaxAttempts: 2,
    adminChallengeTtlSeconds: 120,
    nodeEnv: 'test',
    otpProvider: 'none',
  };
  const logger = { log: vi.fn(), warn: vi.fn() };
  const audit = {
    record: vi.fn().mockResolvedValue(undefined),
    recordInTransaction: vi.fn().mockResolvedValue(undefined),
  };
  return {
    auth: new AuthService(
      {} as never,
      config as never,
      database as never,
      logger as never,
      delivery,
      {} as never,
      audit as never,
    ),
    delivery,
  };
}

describe('OTP concurrency', () => {
  it('allows only one of two parallel sends and stores only a hash', async () => {
    const database = otpDatabase();
    const { auth, delivery } = createService(database.service);
    const results = await Promise.allSettled([
      auth.sendOtp('09120000000', 'AUTH_PARENT'),
      auth.sendOtp('09120000000', 'AUTH_PARENT'),
    ]);
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(results.find((result) => result.status === 'rejected')).toMatchObject({
      reason: { code: 'OTP_RESEND_COOLDOWN' },
    });
    expect(database.rows).toHaveLength(1);
    expect(database.rows[0].codeHash).not.toBe(delivery.send.mock.calls[0][0].code);
    expect(
      await argon2.verify(database.rows[0].codeHash, delivery.send.mock.calls[0][0].code),
    ).toBe(true);
  });

  it('does not apply resend cooldown to a code invalidated after delivery failure', async () => {
    const database = otpDatabase();
    const { auth, delivery } = createService(database.service);
    delivery.send.mockRejectedValueOnce(new Error('provider unavailable'));
    await expect(auth.sendOtp('09120000000', 'AUTH_PARENT')).rejects.toThrow(
      'provider unavailable',
    );
    delivery.send.mockResolvedValueOnce(undefined);
    await expect(auth.sendOtp('09120000000', 'AUTH_PARENT')).resolves.toMatchObject({
      cooldownSeconds: 60,
    });
    expect(database.rows).toHaveLength(2);
    expect(database.rows[0].invalidatedAt).toBeInstanceOf(Date);
  });

  it('consumes a correct code only once under parallel verification', async () => {
    const hash = await argon2.hash('123456');
    const database = otpDatabase([row(hash)]);
    const { auth } = createService(database.service);
    const results = await Promise.allSettled([
      auth.verifyOtp('09120000000', 'AUTH_PARENT', '123456'),
      auth.verifyOtp('09120000000', 'AUTH_PARENT', '123456'),
    ]);
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(database.rows[0].verifiedAt).toBeInstanceOf(Date);
  });

  it('persists expiry and brute-force invalidation', async () => {
    const expiredDb = otpDatabase([row(await argon2.hash('123456'), new Date(0))]);
    await expect(
      createService(expiredDb.service).auth.verifyOtp('09120000000', 'AUTH_PARENT', '123456'),
    ).rejects.toMatchObject({ code: 'OTP_EXPIRED' });
    expect(expiredDb.rows[0].invalidatedAt).toBeInstanceOf(Date);

    const bruteDb = otpDatabase([row(await argon2.hash('123456'))]);
    const auth = createService(bruteDb.service).auth;
    await expect(auth.verifyOtp('09120000000', 'AUTH_PARENT', '000000')).rejects.toMatchObject({
      code: 'OTP_INVALID',
    });
    await expect(auth.verifyOtp('09120000000', 'AUTH_PARENT', '000000')).rejects.toMatchObject({
      code: 'OTP_INVALID',
    });
    expect(bruteDb.rows[0].attemptCount).toBe(2);
    expect(bruteDb.rows[0].invalidatedAt).toBeInstanceOf(Date);
  });

  it('distinguishes a missing request from exhausted attempts without account disclosure', async () => {
    const missing = otpDatabase();
    await expect(
      createService(missing.service).auth.verifyOtp('09120000000', 'AUTH_PARENT', '123456'),
    ).rejects.toMatchObject({ code: 'OTP_REQUEST_MISSING' });

    const exhaustedRow = row(await argon2.hash('123456'));
    exhaustedRow.attemptCount = exhaustedRow.maxAttempts;
    const exhausted = otpDatabase([exhaustedRow]);
    await expect(
      createService(exhausted.service).auth.verifyOtp('09120000000', 'AUTH_PARENT', '123456'),
    ).rejects.toMatchObject({ code: 'OTP_ATTEMPTS_EXCEEDED' });
  });
});

describe('OTP expiry window', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it.each([
    ['119 seconds after issuance', 119_000, true],
    ['exactly at the 120-second boundary', 120_000, false],
    ['after the 120-second boundary', 120_001, false],
  ] as const)('%s: valid=%s', async (_label, elapsed, shouldSucceed) => {
    vi.useFakeTimers();
    const issuedAt = Date.now();
    vi.setSystemTime(new Date(issuedAt));
    const hash = await argon2.hash('123456');
    const database = otpDatabase([row(hash, new Date(issuedAt + 120_000))]);
    const { auth } = createService(database.service);

    vi.setSystemTime(new Date(issuedAt + elapsed));
    const promise = auth.verifyOtp('09120000000', 'AUTH_PARENT', '123456');
    if (shouldSucceed) {
      await expect(promise).resolves.toBeDefined();
    } else {
      await expect(promise).rejects.toMatchObject({ code: 'OTP_EXPIRED' });
    }
    vi.useRealTimers();
  });
});

describe('OTP resend', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('supersedes an existing unverified code once the cooldown has passed', async () => {
    vi.useFakeTimers();
    const base = Date.now();
    vi.setSystemTime(new Date(base));
    const database = otpDatabase();
    const { auth, delivery } = createService(database.service);

    await auth.sendOtp('09120000000', 'AUTH_PARENT');
    const firstCode = delivery.send.mock.calls[0][0].code;
    expect(database.rows).toHaveLength(1);

    vi.setSystemTime(new Date(base + 61_000));
    await auth.sendOtp('09120000000', 'AUTH_PARENT');
    const secondCode = delivery.send.mock.calls[1][0].code;
    expect(database.rows).toHaveLength(2);
    expect(database.rows[0].invalidatedAt).toBeInstanceOf(Date);

    await expect(auth.verifyOtp('09120000000', 'AUTH_PARENT', firstCode)).rejects.toThrow();
    await expect(auth.verifyOtp('09120000000', 'AUTH_PARENT', secondCode)).resolves.toBeDefined();
    expect(database.rows[1].verifiedAt).toBeInstanceOf(Date);
  });
});

function row(codeHash: string, expiresAt = new Date(Date.now() + 60_000)): OtpRow {
  return {
    id: 'otp-1',
    phoneNumber: '09120000000',
    purpose: 'AUTH_PARENT',
    codeHash,
    expiresAt,
    attemptCount: 0,
    maxAttempts: 2,
    verifiedAt: null,
    invalidatedAt: null,
    requestIp: null,
    createdAt: new Date(),
  };
}

type ChallengeRow = {
  id: string;
  adminId: string;
  challengeHash: string;
  expiresAt: Date;
  attemptCount: number;
  maxAttempts: number;
  usedAt: Date | null;
  invalidatedAt: Date | null;
  requestIp: string | null;
  createdAt: Date;
};

function twoFactorDatabase(adminId: string) {
  const challenges: ChallengeRow[] = [];
  const otps: Array<Record<string, unknown>> = [];
  const admins = [
    {
      id: adminId,
      username: 'demo-admin',
      phoneNumber: '09120000000',
      status: 'ACTIVE',
      passwordHash: null as string | null,
    },
  ];
  const sessions: Array<Record<string, unknown>> = [];
  const tables = new Map<unknown, Array<Record<string, unknown>>>([
    [adminAuthChallenges, challenges],
    [otpRequests, otps],
    [adminUsers, admins],
    [authSessions, sessions],
  ]);

  let tail = Promise.resolve();
  const select = (rows: Array<Record<string, unknown>>) => ({
    then: (resolve: (value: unknown) => unknown, reject: (reason?: unknown) => unknown) =>
      Promise.resolve(rows).then(resolve, reject),
    where: () => select(rows),
    orderBy: () => select(rows),
    limit: (n: number) => select(rows.slice(0, n)),
  });
  const update = (rows: Array<Record<string, unknown>>) => ({
    set: (changes: Record<string, unknown>) => ({
      where: async () => {
        for (const row of rows) Object.assign(row, changes);
      },
      returning: async () => rows.slice(0, 1),
    }),
  });
  const insert = (rows: Array<Record<string, unknown>>) => ({
    values: async (value: Record<string, unknown>) => rows.push(value),
  });
  const transaction = async <T>(work: (txn: any) => Promise<T>): Promise<T> => {
    const previous = tail;
    let release!: () => void;
    tail = new Promise<void>((resolve) => (release = resolve));
    await previous;
    const txn = {
      execute: async () => {},
      select: () => ({
        from: (table: unknown) => select(tables.get(table) ?? []),
      }),
      update: (table: unknown) => update(tables.get(table) ?? []),
      insert: (table: unknown) => insert(tables.get(table) ?? []),
    };
    try {
      return await work(txn);
    } finally {
      release();
    }
  };
  return {
    rows: { challenges, otps, admins, sessions },
    service: {
      db: {
        transaction,
        update: (table: unknown) => update(tables.get(table) ?? []),
      },
    },
  };
}

function createTwoFactorService(database: ReturnType<typeof twoFactorDatabase>['service']) {
  const delivery = { send: vi.fn().mockResolvedValue(undefined) };
  const config = {
    otpExpirySeconds: 300,
    otpResendCooldownSeconds: 60,
    otpMaxAttempts: 2,
    adminChallengeTtlSeconds: 120,
    adminJwtAccessTokenTtl: 60,
    adminJwtRefreshTokenTtl: 120,
    jwtSecret: 'secret',
    nodeEnv: 'test',
    otpProvider: 'none',
  };
  const logger = { log: vi.fn(), warn: vi.fn() };
  const audit = {
    record: vi.fn().mockResolvedValue(undefined),
    recordInTransaction: vi.fn().mockResolvedValue(undefined),
  };
  const jwt = { signAsync: vi.fn().mockResolvedValue('signed-token') };
  const auth = new AuthService(
    jwt as never,
    config as never,
    database as never,
    logger as never,
    delivery,
    {} as never,
    audit as never,
  );
  return { auth, jwt };
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

describe('admin two-factor challenge', () => {
  it('consumes a single-use challenge and its OTP only once, even under parallel verification', async () => {
    const adminId = 'admin-1';
    const database = twoFactorDatabase(adminId);
    database.rows.admins[0].passwordHash = await argon2.hash('secret-pass');
    database.rows.challenges.push({
      id: 'challenge-1',
      adminId,
      challengeHash: hashToken('challenge-token'),
      expiresAt: new Date(Date.now() + 60_000),
      attemptCount: 0,
      maxAttempts: 5,
      usedAt: null,
      invalidatedAt: null,
      requestIp: null,
      createdAt: new Date(),
    });
    database.rows.otps.push({
      id: 'otp-1',
      phoneNumber: '09120000000',
      purpose: 'AUTH_ADMIN',
      codeHash: await argon2.hash('123456'),
      expiresAt: new Date(Date.now() + 60_000),
      attemptCount: 0,
      maxAttempts: 5,
      verifiedAt: null,
      invalidatedAt: null,
      requestIp: null,
      createdAt: new Date(),
    });
    const { auth, jwt } = createTwoFactorService(database.service);

    const results = await Promise.allSettled([
      auth.verifyAdminOtp('challenge-token', '123456'),
      auth.verifyAdminOtp('challenge-token', '123456'),
    ]);

    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter((result) => result.status === 'rejected')).toHaveLength(1);
    expect(database.rows.challenges[0].usedAt).toBeInstanceOf(Date);
    expect(database.rows.otps[0].verifiedAt).toBeInstanceOf(Date);
    expect(jwt.signAsync).toHaveBeenCalledTimes(2);
    expect(database.rows.sessions).toHaveLength(1);
  });

  it('rejects a used challenge on a later attempt and counts failed OTP attempts', async () => {
    const adminId = 'admin-1';
    const database = twoFactorDatabase(adminId);
    database.rows.admins[0].passwordHash = await argon2.hash('secret-pass');
    database.rows.challenges.push({
      id: 'challenge-1',
      adminId,
      challengeHash: hashToken('challenge-token'),
      expiresAt: new Date(Date.now() + 60_000),
      attemptCount: 0,
      maxAttempts: 2,
      usedAt: null,
      invalidatedAt: null,
      requestIp: null,
      createdAt: new Date(),
    });
    database.rows.otps.push({
      id: 'otp-1',
      phoneNumber: '09120000000',
      purpose: 'AUTH_ADMIN',
      codeHash: await argon2.hash('123456'),
      expiresAt: new Date(Date.now() + 60_000),
      attemptCount: 0,
      maxAttempts: 2,
      verifiedAt: null,
      invalidatedAt: null,
      requestIp: null,
      createdAt: new Date(),
    });
    const { auth } = createTwoFactorService(database.service);

    await expect(auth.verifyAdminOtp('challenge-token', '000000')).rejects.toMatchObject({
      code: 'OTP_INVALID',
    });
    expect(database.rows.challenges[0].attemptCount).toBe(1);
    expect(database.rows.otps[0].attemptCount).toBe(1);
  });
});
