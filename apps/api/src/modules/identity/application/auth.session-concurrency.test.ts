import { describe, expect, it, vi } from 'vitest';
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
      isSuperAdmin: true,
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
