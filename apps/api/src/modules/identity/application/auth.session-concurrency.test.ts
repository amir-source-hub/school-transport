import { describe, expect, it, vi } from 'vitest';
import { createHash } from 'node:crypto';
import { AuthService } from './auth.service';
import { adminUsers, authSessions } from '../../../database/schemas';

describe('refresh session rotation', () => {
  it.each(['PARENT', 'ADMIN'] as const)(
    'allows only one concurrent %s refresh to claim the old session',
    async (role) => {
      let oldSessionActive = true;
      const inserted: Array<{ id: string }> = [];
      let tail = Promise.resolve();
      const database = {
        db: {
          transaction: async (work: (txn: any) => Promise<unknown>) => {
            const previous = tail;
            let release!: () => void;
            tail = new Promise<void>((resolve) => (release = resolve));
            await previous;
            const txn = {
              update: () => ({
                set: () => ({
                  where: () => ({
                    returning: async () => {
                      if (!oldSessionActive) return [];
                      oldSessionActive = false;
                      return [{ id: 'old-session' }];
                    },
                  }),
                }),
              }),
              insert: () => ({ values: async (value: { id: string }) => inserted.push(value) }),
            };
            try {
              return await work(txn);
            } finally {
              release();
            }
          },
        },
      };
      const jwt = { signAsync: vi.fn().mockResolvedValue('signed-token') };
      const config = {
        jwtSecret: 'secret',
        jwtAccessTokenTtl: 60,
        jwtRefreshTokenTtl: 120,
        adminJwtAccessTokenTtl: 60,
        adminJwtRefreshTokenTtl: 120,
      };
      const audit = { record: vi.fn(), recordInTransaction: vi.fn() };
      const service = new AuthService(
        jwt as never, config as never, database as never, {} as never, {} as never, {} as never, audit as never,
      );
      const generate = (service as any).generateTokens.bind(service) as (
        id: string,
        role: 'PARENT' | 'ADMIN',
        context: undefined,
        oldSession: string,
      ) => Promise<unknown>;

      const results = await Promise.allSettled([
        generate('subject-1', role, undefined, 'old-session'),
        generate('subject-1', role, undefined, 'old-session'),
      ]);

      expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
      expect(results.filter((result) => result.status === 'rejected')).toHaveLength(1);
      expect(inserted).toHaveLength(1);
    },
  );
});

describe('credential change session revocation', () => {
  it('revokes all admin sessions and audits when the password changes', async () => {
    const currentAdmin = {
      id: 'admin-1',
      username: 'demo-admin',
      firstName: 'Demo',
      lastName: 'Admin',
      phoneNumber: '09120000000',
      email: null,
      status: 'ACTIVE',
      lastLoginAt: null,
      createdAt: new Date(),
    };
    const revocations: Array<Record<string, unknown>> = [];
    const select = (rows: unknown[]) => ({
      then: (resolve: (value: unknown) => unknown, reject: (reason?: unknown) => unknown) =>
        Promise.resolve(rows).then(resolve, reject),
      where: () => select(rows),
      orderBy: () => select(rows),
      limit: (n: number) => select(rows.slice(0, n)),
    });
    const db = {
      db: {
        select: () => ({
          from: (table: unknown) =>
            select(table === adminUsers ? [currentAdmin] : []),
        }),
        update: (table: unknown) =>
          table === authSessions
            ? {
                set: (changes: Record<string, unknown>) => ({
                  where: async () => {
                    revocations.push(changes);
                  },
                }),
              }
            : {
                set: () => ({
                  where: () => ({
                    returning: async () => [{ ...currentAdmin }],
                  }),
                }),
              },
      },
    };
    const audit = { record: vi.fn().mockResolvedValue(undefined), recordInTransaction: vi.fn() };
    const service = new AuthService(
      {} as never,
      { jwtSecret: 'secret' } as never,
      db as never,
      {} as never,
      {} as never,
      {} as never,
      audit as never,
    );

    await service.updateAdmin('admin-1', { password: 'new-secret-password' }, { id: 'admin-1' });

    expect(revocations).toHaveLength(1);
    expect(revocations[0].revocationReason).toBe('CREDENTIALS_CHANGED');
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'ADMIN_EDIT', entityType: 'ADMIN', entityId: 'admin-1' }),
    );
  });
});

describe('remembered session lifetimes', () => {
  const config = {
    jwtSecret: 'secret',
    jwtAccessTokenTtl: 3600,
    jwtRefreshTokenTtl: 86400,
    jwtRememberRefreshTokenTtl: 604800,
    adminJwtAccessTokenTtl: 3600,
    adminJwtRefreshTokenTtl: 86400,
    adminJwtRememberRefreshTokenTtl: 604800,
  };

  it.each([
    ['PARENT', false, 86_400],
    ['PARENT', true, 604_800],
    ['ADMIN', false, 86_400],
    ['ADMIN', true, 604_800],
  ] as const)(
    'issues a %s session with a %s-second refresh lifetime when remembered is %s',
    async (role, rememberMe, expectedTtlSeconds) => {
      let inserted: Record<string, unknown> | undefined;
      const db = {
        db: {
          transaction: async (work: (txn: any) => Promise<unknown>) => {
            const txn = {
              insert: () => ({
                values: async (value: Record<string, unknown>) => {
                  inserted = value;
                },
              }),
              update: () => ({
                set: () => ({
                  where: () => ({
                    returning: async () => [],
                  }),
                }),
              }),
            };
            await work(txn);
          },
        },
      };
      const audit = { record: vi.fn(), recordInTransaction: vi.fn() };
      const service = new AuthService(
        { signAsync: vi.fn().mockResolvedValue('token') } as never,
        config as never,
        db as never,
        {} as never,
        {} as never,
        {} as never,
        audit as never,
      );
      const generate = (service as any).generateTokens.bind(service) as (
        id: string,
        role: 'PARENT' | 'ADMIN',
        context: undefined,
        replacedSessionId?: string,
        rememberMe?: boolean,
      ) => Promise<unknown>;

      await generate('subject-1', role, undefined, undefined, rememberMe);

      expect(inserted!.remembered).toBe(rememberMe);
      const delta = (inserted!.expiresAt as Date).getTime() - Date.now();
      expect(delta).toBeGreaterThan(expectedTtlSeconds * 1000 - 1000);
      expect(delta).toBeLessThanOrEqual(expectedTtlSeconds * 1000 + 1000);
    },
  );

  it('preserves the remembered window when a refresh token is rotated', async () => {
    const session = {
      id: 'session-1',
      subjectId: 'subject-1',
      role: 'ADMIN',
      refreshTokenHash: createHash('sha256').update('some-refresh-token').digest('hex'),
      remembered: true,
      revokedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
      status: 'ACTIVE',
    };
    const inserted: Array<Record<string, unknown>> = [];
    const db = {
      db: {
        select: () => ({
          from: () => ({
            where: () => ({
              limit: (n: number) => Promise.resolve([session]).then((rows) => rows.slice(0, n)),
            }),
          }),
        }),
        update: () => ({
          set: () => ({
            where: async () => {},
          }),
        }),
        transaction: async (work: (txn: any) => Promise<unknown>) => {
          const txn = {
            insert: () => ({
              values: async (value: Record<string, unknown>) => inserted.push(value),
            }),
            update: () => ({
              set: () => ({
                where: () => ({
                  returning: async () => [{ id: 'session-1' }],
                }),
              }),
            }),
          };
          await work(txn);
        },
      },
    };
    const audit = { record: vi.fn(), recordInTransaction: vi.fn() };
    const service = new AuthService(
      {
        verifyAsync: vi.fn().mockResolvedValue({
          sub: 'subject-1',
          role: 'ADMIN',
          type: 'refresh',
          sid: 'session-1',
        }),
        signAsync: vi.fn().mockResolvedValue('signed-token'),
      } as never,
      config as never,
      db as never,
      {} as never,
      {} as never,
      {} as never,
      audit as never,
    );

    const result = await service.refreshTokens('some-refresh-token');

    expect(result.remembered).toBe(true);
    expect(inserted[0].remembered).toBe(true);
    const delta = (inserted[0].expiresAt as Date).getTime() - Date.now();
    expect(delta).toBeGreaterThan(604_800 * 1000 - 1000);
    expect(delta).toBeLessThanOrEqual(604_800 * 1000 + 1000);
  });
});

describe('refresh token lifecycle', () => {
  const sha = (value: string) => createHash('sha256').update(value).digest('hex');

  const config = {
    jwtSecret: 'secret',
    jwtAccessTokenTtl: 3600,
    jwtRefreshTokenTtl: 86400,
    jwtRememberRefreshTokenTtl: 604800,
    adminJwtAccessTokenTtl: 3600,
    adminJwtRefreshTokenTtl: 86400,
    adminJwtRememberRefreshTokenTtl: 604800,
  };

  function build(overrides: {
    hashMismatch?: boolean;
    status?: string;
    revokedAt?: Date | null;
  } = {}) {
    const revocations: Array<Record<string, unknown>> = [];
    const session = {
      id: 'session-1',
      subjectId: 'subject-1',
      role: 'PARENT',
      refreshTokenHash: overrides.hashMismatch ? 'wrong-hash' : sha('some-refresh-token'),
      remembered: false,
      revokedAt: overrides.revokedAt ?? null,
      expiresAt: new Date(Date.now() + 60_000),
      status: overrides.status ?? 'ACTIVE',
    };
    const db = {
      db: {
        select: () => ({
          from: () => ({
            where: () => ({
              limit: (n: number) => Promise.resolve([session]).then((rows) => rows.slice(0, n)),
            }),
          }),
        }),
        update: (table: unknown) => ({
          set: (changes: Record<string, unknown>) => ({
            where: async () => {
              if (table === authSessions) revocations.push(changes);
            },
          }),
        }),
        transaction: async (work: (txn: any) => Promise<unknown>) => {
          const txn = {
            insert: () => ({ values: async () => {} }),
            update: () => ({
              set: () => ({
                where: () => ({
                  returning: async () => [],
                }),
              }),
            }),
          };
          await work(txn);
        },
      },
    };
    const audit = { record: vi.fn(), recordInTransaction: vi.fn() };
    const logger = { log: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() };
    const service = new AuthService(
      {
        verifyAsync: vi.fn().mockResolvedValue({
          sub: 'subject-1',
          role: 'PARENT',
          type: 'refresh',
          sid: 'session-1',
        }),
        signAsync: vi.fn().mockResolvedValue('signed-token'),
      } as never,
      config as never,
      db as never,
      logger as never,
      {} as never,
      {} as never,
      audit as never,
    );
    return { service, revocations };
  }

  it('revokes every session when a refresh token is reused', async () => {
    const { service, revocations } = build({ hashMismatch: true });
    await expect(service.refreshTokens('some-refresh-token')).rejects.toThrow(
      'Invalid or expired refresh token.',
    );
    expect(revocations).toHaveLength(1);
    expect(revocations[0].revocationReason).toBe('REFRESH_TOKEN_REUSE');
  });

  it('rejects refresh for a disabled account and revokes its sessions', async () => {
    const { service, revocations } = build({ status: 'INACTIVE' });
    await expect(service.refreshTokens('some-refresh-token')).rejects.toThrow(
      'Invalid or expired refresh token.',
    );
    expect(revocations.some((entry) => entry.revocationReason === 'ACCOUNT_DISABLED')).toBe(true);
  });

  it('revokes only the current session on logout', async () => {
    const { service, revocations } = build();
    await service.logout('subject-1', 'session-1');
    expect(revocations).toHaveLength(1);
    expect(revocations[0].revocationReason).toBe('LOGOUT');
  });
});
