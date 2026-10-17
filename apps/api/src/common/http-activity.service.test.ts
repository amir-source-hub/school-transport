import { afterEach, describe, expect, it, vi } from 'vitest';
import { HttpActivityService, type HttpActivityRecord } from './http-activity.service';

const record = { method: 'GET', route: '/api/v1/test', statusCode: 200 } as HttpActivityRecord;

afterEach(() => {
  vi.useRealTimers();
});

describe('HttpActivityService resilience', () => {
  it('contains background persistence failures and retries the restored batch', async () => {
    vi.useFakeTimers();
    const values = vi
      .fn()
      .mockRejectedValueOnce(new Error('database unavailable'))
      .mockResolvedValueOnce(undefined);
    const insert = vi.fn(() => ({ values }));
    const logger = { error: vi.fn() };
    const service = new HttpActivityService({ db: { insert } } as never, logger as never);

    service.enqueue(record);
    await vi.advanceTimersByTimeAsync(250);

    expect(logger.error).toHaveBeenCalledWith(
      'Failed to persist HTTP activity batch.',
      expect.stringContaining('database unavailable'),
      HttpActivityService.name,
    );

    await service.flush();
    expect(values).toHaveBeenCalledTimes(2);
    await service.onModuleDestroy();
  });

  it('keeps the outage buffer bounded and logs saturation once', async () => {
    const values = vi.fn().mockRejectedValue(new Error('database unavailable'));
    const logger = { error: vi.fn() };
    const service = new HttpActivityService(
      { db: { insert: () => ({ values }) } } as never,
      logger as never,
    );

    for (let index = 0; index < 20_100; index += 1) service.enqueue(record);
    await Promise.resolve();
    service.enqueue(record);
    service.enqueue(record);

    const saturationLogs = logger.error.mock.calls.filter(([message]) =>
      String(message).includes('buffer is full'),
    );
    expect(saturationLogs).toHaveLength(1);
    await service.onModuleDestroy();
  });
});
