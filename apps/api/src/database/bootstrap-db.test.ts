import { describe, expect, it, vi } from 'vitest';
import { bootstrapDatabase } from './bootstrap-db';

describe('bootstrapDatabase', () => {
  it('migrates without seeding by default and on production restart', async () => {
    const migrate = vi.fn().mockResolvedValue(undefined);
    const seed = vi.fn();
    await bootstrapDatabase({ NODE_ENV: 'production', DATABASE_URL: 'db' }, migrate, seed);
    expect(migrate).toHaveBeenCalledWith('db');
    expect(seed).not.toHaveBeenCalled();
  });

  it('seeds only when explicitly requested in development', async () => {
    const migrate = vi.fn().mockResolvedValue(undefined);
    const seed = vi.fn().mockResolvedValue(undefined);
    await bootstrapDatabase(
      { NODE_ENV: 'development', DATABASE_URL: 'db', SEED_DEMO_DATA: 'true' }, migrate, seed,
    );
    expect(seed).toHaveBeenCalledWith('db');
  });

  it('refuses explicit demo seeding in production', async () => {
    await expect(bootstrapDatabase(
      { NODE_ENV: 'production', DATABASE_URL: 'db', SEED_DEMO_DATA: 'true' },
      vi.fn(), vi.fn(),
    )).rejects.toThrow('forbidden');
  });
});
