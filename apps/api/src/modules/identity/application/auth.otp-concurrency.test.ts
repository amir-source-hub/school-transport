import { describe, expect, it, vi } from 'vitest';
import * as argon2 from 'argon2';
import { AuthService } from './auth.service';

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
    otpExpirySeconds: 300,
    otpResendCooldownSeconds: 60,
    otpMaxAttempts: 2,
    nodeEnv: 'test',
    otpProvider: 'none',
  };
  const logger = { log: vi.fn(), warn: vi.fn() };
  return {
    auth: new AuthService({} as never, config as never, database as never, logger as never, delivery, {} as never),
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
    expect(database.rows).toHaveLength(1);
    expect(database.rows[0].codeHash).not.toBe(delivery.send.mock.calls[0][0].code);
    expect(await argon2.verify(database.rows[0].codeHash, delivery.send.mock.calls[0][0].code)).toBe(true);
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
    await expect(createService(expiredDb.service).auth.verifyOtp('09120000000', 'AUTH_PARENT', '123456')).rejects.toThrow('expired');
    expect(expiredDb.rows[0].invalidatedAt).toBeInstanceOf(Date);

    const bruteDb = otpDatabase([row(await argon2.hash('123456'))]);
    const auth = createService(bruteDb.service).auth;
    await expect(auth.verifyOtp('09120000000', 'AUTH_PARENT', '000000')).rejects.toThrow('Invalid');
    await expect(auth.verifyOtp('09120000000', 'AUTH_PARENT', '000000')).rejects.toThrow('Invalid');
    expect(bruteDb.rows[0].attemptCount).toBe(2);
    expect(bruteDb.rows[0].invalidatedAt).toBeInstanceOf(Date);
  });
});

function row(codeHash: string, expiresAt = new Date(Date.now() + 60_000)): OtpRow {
  return {
    id: 'otp-1', phoneNumber: '09120000000', purpose: 'AUTH_PARENT', codeHash, expiresAt,
    attemptCount: 0, maxAttempts: 2, verifiedAt: null, invalidatedAt: null, requestIp: null,
    createdAt: new Date(),
  };
}
