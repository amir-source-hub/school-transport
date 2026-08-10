import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { ConfigService } from '../../config/config.service';
import type { AppLogger } from '../../common/logger';
import {
  MAINTENANCE_JOB_NAMES,
  MAINTENANCE_SCHEDULES,
  retentionCutoff,
} from './queue.service';

const redisMock = {
  connect: vi.fn(async () => undefined),
  ping: vi.fn(async () => 'PONG'),
  on: vi.fn(),
  status: 'ready',
  disconnect: vi.fn(),
  quit: vi.fn(async () => undefined),
};

const added: Array<{ name: string; options: Record<string, unknown> }> = [];

vi.mock('ioredis', () => ({
  default: vi.fn(() => redisMock),
}));

vi.mock('bullmq', () => ({
  Queue: vi.fn((name: string) => ({
    name,
    add: vi.fn(async (jobName: string, _data: unknown, options: unknown) => {
      added.push({ name: jobName, options: options as Record<string, unknown> });
    }),
    close: vi.fn(async () => undefined),
  })),
  Worker: vi.fn(() => ({
    name: 'maintenance',
    on: vi.fn(),
    close: vi.fn(async () => undefined),
  })),
  Job: class {},
}));

describe('authentication retention cutoff', () => {
  it('keeps the configured number of complete days', () => {
    expect(retentionCutoff(new Date('2026-07-22T12:00:00.000Z'), 30).toISOString()).toBe(
      '2026-06-22T12:00:00.000Z',
    );
  });
});

describe('maintenance schedule configuration', () => {
  it('schedules student-photo cleanup on the maintenance queue', () => {
    expect(MAINTENANCE_SCHEDULES.studentPhotoCleanup.jobId).toBe(
      'scheduled-student-photo-cleanup',
    );
    expect(MAINTENANCE_SCHEDULES.studentPhotoCleanup.every).toBe(30 * 60 * 1_000);
    expect(MAINTENANCE_JOB_NAMES.studentPhotoCleanup).toBe('cleanup-student-photos');
  });

  it('keeps the other maintenance schedules stable', () => {
    expect(MAINTENANCE_SCHEDULES.authRetention.pattern).toBe('15 3 * * *');
    expect(MAINTENANCE_SCHEDULES.notificationOutbox.every).toBe(5_000);
    expect(MAINTENANCE_SCHEDULES.smsBroadcasts.every).toBe(5_000);
    expect(MAINTENANCE_JOB_NAMES.authRetention).toBe('purge-expired-auth-data');
    expect(MAINTENANCE_JOB_NAMES.notificationOutbox).toBe('dispatch-notification-outbox');
    expect(MAINTENANCE_JOB_NAMES.smsBroadcasts).toBe('dispatch-sms-broadcasts');
  });
});

describe('maintenance queue job registration', () => {
  let queueService: InstanceType<typeof import('./queue.service').QueueService>;

  beforeEach(async () => {
    added.length = 0;
    vi.clearAllMocks();
    const { QueueService } = await import('./queue.service');
    queueService = new QueueService(
      {
        redisUrl: 'redis://:test@127.0.0.1:6379',
        readinessTimeoutMs: 5_000,
        queueRequired: true,
        serviceRole: 'worker',
        authSessionRetentionDays: 30,
      } as unknown as ConfigService,
      { log: vi.fn(), warn: vi.fn(), error: vi.fn() } as unknown as AppLogger,
      { db: { delete: vi.fn(), update: vi.fn() } } as never,
      { dispatchAvailable: vi.fn(async () => undefined) } as never,
      { dispatchAvailable: vi.fn(async () => undefined) } as never,
      { cleanupExpired: vi.fn(async () => 0) } as never,
      { recordQueue: vi.fn() } as never,
    );
    await queueService.onModuleInit();
  });

  it('registers exactly the expected maintenance jobs on module init', () => {
    expect(added.map(({ name }) => name)).toEqual([
      'purge-expired-auth-data',
      'dispatch-notification-outbox',
      'dispatch-sms-broadcasts',
      'cleanup-student-photos',
    ]);
  });

  it('registers the student-photo cleanup repeat schedule', () => {
    const cleanup = added.find(({ name }) => name === 'cleanup-student-photos');
    expect(cleanup?.options.jobId).toBe('scheduled-student-photo-cleanup');
    expect((cleanup?.options.repeat as { every: number }).every).toBe(30 * 60 * 1_000);
    expect(cleanup?.options.removeOnComplete).toBe(30);
    expect(cleanup?.options.removeOnFail).toBe(100);
  });

  it('dispatches cleanupExpired when the maintenance job runs', async () => {
    const { QueueService } = await import('./queue.service');
    const cleanup = vi.fn(async () => 0);
    const service = new QueueService(
      {
        redisUrl: 'redis://:test@127.0.0.1:6379',
        readinessTimeoutMs: 5_000,
        queueRequired: true,
        serviceRole: 'worker',
        authSessionRetentionDays: 30,
      } as unknown as ConfigService,
      { log: vi.fn(), warn: vi.fn(), error: vi.fn() } as unknown as AppLogger,
      { db: { delete: vi.fn(), update: vi.fn() } } as never,
      { dispatchAvailable: vi.fn(async () => undefined) } as never,
      { dispatchAvailable: vi.fn(async () => undefined) } as never,
      { cleanupExpired: cleanup } as never,
      { recordQueue: vi.fn() } as never,
    );
    const job = { name: 'cleanup-student-photos' };
    await service['processMaintenance'](job as never);
    expect(cleanup).toHaveBeenCalledTimes(1);
  });
});
