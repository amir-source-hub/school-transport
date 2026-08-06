import { ServiceUnavailableException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { HealthController } from './health.controller';

function controller(database = true, queue = true, required = true, draining = false) {
  return new HealthController(
    { isReady: vi.fn().mockResolvedValue(database) } as never,
    { isReady: vi.fn().mockResolvedValue(queue) } as never,
    { readinessTimeoutMs: 50, queueRequired: required } as never,
    { isDraining: draining } as never,
  );
}

describe('HealthController', () => {
  it('keeps liveness independent from dependencies', () => {
    expect(controller(false, false).health()).toMatchObject({ data: { status: 'alive' } });
  });

  it('reports ready only when required dependencies are available', async () => {
    await expect(controller(true, true).ready()).resolves.toMatchObject({
      data: { status: 'ready', database: 'up', queue: 'up' },
    });
    await expect(controller(false, true).ready()).rejects.toBeInstanceOf(ServiceUnavailableException);
    await expect(controller(true, false).ready()).rejects.toBeInstanceOf(ServiceUnavailableException);
    await expect(controller(true, false, false).ready()).resolves.toMatchObject({
      data: { queue: 'optional' },
    });
  });

  it('fails readiness while draining and on a dependency timeout', async () => {
    await expect(controller(true, true, true, true).ready()).rejects.toBeInstanceOf(ServiceUnavailableException);
    const health = new HealthController(
      { isReady: () => new Promise(() => undefined) } as never,
      { isReady: vi.fn().mockResolvedValue(true) } as never,
      { readinessTimeoutMs: 5, queueRequired: true } as never,
      { isDraining: false } as never,
    );
    await expect(health.ready()).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
