import { describe, expect, it, vi } from 'vitest';
import { GracefulShutdownService } from './graceful-shutdown';

describe('GracefulShutdownService', () => {
  it('marks draining immediately and closes the database only once', async () => {
    const database = { onModuleDestroy: vi.fn().mockResolvedValue(undefined) };
    const logger = { log: vi.fn() };
    const readiness = { beginDraining: vi.fn() };
    const queue = { onModuleDestroy: vi.fn().mockResolvedValue(undefined) };
    const shutdown = new GracefulShutdownService(
      database as never,
      logger as never,
      readiness as never,
      queue as never,
    );
    await Promise.all([
      shutdown.onApplicationShutdown('SIGTERM'),
      shutdown.onApplicationShutdown('SIGTERM'),
    ]);
    expect(readiness.beginDraining).toHaveBeenCalledTimes(1);
    expect(database.onModuleDestroy).toHaveBeenCalledTimes(1);
    expect(queue.onModuleDestroy).toHaveBeenCalledTimes(1);
  });
});
