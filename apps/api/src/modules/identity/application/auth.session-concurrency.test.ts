import { describe, expect, it, vi } from 'vitest';
import { AuthService } from './auth.service';

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
      const service = new AuthService(
        jwt as never, config as never, database as never, {} as never, {} as never, {} as never,
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
