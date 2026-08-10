import {
  forwardRef,
  Inject,
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
  Optional,
} from '@nestjs/common';
import { Job, Queue, Worker } from 'bullmq';
import IORedis from 'ioredis';
import { ConfigService } from '../../config/config.service';
import { AppLogger } from '../../common/logger';
import { DatabaseService } from '../../database/database.service';
import { authSessions, otpRequests, onboardingSessions } from '../../database/schemas';
import { lt, and, eq } from 'drizzle-orm';
import { InAppNotificationService } from '../notifications/in-app-notification.service';
import { BroadcastsService } from '../../modules/broadcasts/broadcasts.service';
import { StudentPhotosService } from '../../modules/student-images/student-photos.service';
import { OperationalMetricsService } from '../metrics/operational-metrics.service';

export const QUEUE_NAMES = {
  notifications: 'notification-delivery',
  maintenance: 'maintenance',
} as const;

export const MAINTENANCE_SCHEDULES = {
  authRetention: { pattern: '15 3 * * *', jobId: 'scheduled-auth-retention' },
  notificationOutbox: { every: 5_000, jobId: 'scheduled-notification-outbox' },
  smsBroadcasts: { every: 5_000, jobId: 'scheduled-sms-broadcasts' },
  studentPhotoCleanup: { every: 30 * 60 * 1_000, jobId: 'scheduled-student-photo-cleanup' },
} as const;

export const MAINTENANCE_JOB_NAMES = {
  authRetention: 'purge-expired-auth-data',
  notificationOutbox: 'dispatch-notification-outbox',
  smsBroadcasts: 'dispatch-sms-broadcasts',
  studentPhotoCleanup: 'cleanup-student-photos',
} as const;

@Injectable()
export class QueueService implements OnModuleInit, OnModuleDestroy {
  private readonly connection: IORedis;
  private readonly queues: Queue[] = [];
  private readonly workers: Worker[] = [];
  private closePromise?: Promise<void>;

  constructor(
    @Inject(forwardRef(() => ConfigService)) private readonly config: ConfigService,
    @Inject(forwardRef(() => AppLogger)) private readonly logger: AppLogger,
    @Inject(forwardRef(() => DatabaseService)) private readonly database: DatabaseService,
    @Inject(forwardRef(() => InAppNotificationService))
    private readonly notificationOutbox: InAppNotificationService,
    @Inject(forwardRef(() => BroadcastsService)) private readonly broadcasts: BroadcastsService,
    @Inject(forwardRef(() => StudentPhotosService))
    private readonly studentPhotos: StudentPhotosService,
    @Optional()
    @Inject(forwardRef(() => OperationalMetricsService))
    private readonly metrics?: OperationalMetricsService,
  ) {
    this.connection = new IORedis(config.redisUrl, {
      maxRetriesPerRequest: null,
      enableReadyCheck: true,
      lazyConnect: true,
      commandTimeout: config.readinessTimeoutMs,
      retryStrategy: config.queueRequired ? undefined : () => null,
    });
    this.connection.on('error', (error) => {
      if (this.config.queueRequired)
        this.logger.error('Redis queue connection failed.', error.stack);
    });
  }

  async onModuleInit(): Promise<void> {
    try {
      await this.connection.connect();
      await this.connection.ping();
    } catch (error) {
      if (this.config.queueRequired) throw error;
      this.connection.disconnect();
      this.logger.warn(
        'Redis is unavailable; background queues are disabled for this development API process.',
        'QueueService',
      );
      return;
    }
    this.queues.push(
      new Queue(QUEUE_NAMES.notifications, { connection: this.connection }),
      new Queue(QUEUE_NAMES.maintenance, { connection: this.connection }),
    );

    if (this.config.serviceRole === 'worker') {
      this.workers.push(
        new Worker(QUEUE_NAMES.notifications, (job) => this.processNotification(job), {
          connection: this.connection,
        }),
        new Worker(QUEUE_NAMES.maintenance, (job) => this.processMaintenance(job), {
          connection: this.connection,
        }),
      );
      for (const worker of this.workers) {
        worker.on('completed', () => this.metrics?.recordQueue(worker.name, 'completed'));
        worker.on('failed', () => this.metrics?.recordQueue(worker.name, 'failed'));
      }
      this.logger.log('BullMQ workers started.');
      await this.queue(QUEUE_NAMES.maintenance).add(
        MAINTENANCE_JOB_NAMES.authRetention,
        {},
        {
          jobId: MAINTENANCE_SCHEDULES.authRetention.jobId,
          repeat: { pattern: MAINTENANCE_SCHEDULES.authRetention.pattern },
          removeOnComplete: 30,
          removeOnFail: 100,
        },
      );
      await this.queue(QUEUE_NAMES.maintenance).add(
        MAINTENANCE_JOB_NAMES.notificationOutbox,
        {},
        {
          jobId: MAINTENANCE_SCHEDULES.notificationOutbox.jobId,
          repeat: { every: MAINTENANCE_SCHEDULES.notificationOutbox.every },
          removeOnComplete: 30,
          removeOnFail: 100,
        },
      );
      await this.queue(QUEUE_NAMES.maintenance).add(
        MAINTENANCE_JOB_NAMES.smsBroadcasts,
        {},
        {
          jobId: MAINTENANCE_SCHEDULES.smsBroadcasts.jobId,
          repeat: { every: MAINTENANCE_SCHEDULES.smsBroadcasts.every },
          removeOnComplete: 30,
          removeOnFail: 100,
        },
      );
      await this.queue(QUEUE_NAMES.maintenance).add(
        MAINTENANCE_JOB_NAMES.studentPhotoCleanup,
        {},
        {
          jobId: MAINTENANCE_SCHEDULES.studentPhotoCleanup.jobId,
          repeat: { every: MAINTENANCE_SCHEDULES.studentPhotoCleanup.every },
          removeOnComplete: 30,
          removeOnFail: 100,
        },
      );
    }
  }

  async enqueueNotification(data: Record<string, unknown>, jobId: string): Promise<void> {
    if (this.queues.length === 0) {
      this.logger.warn('Notification queue skipped because Redis is unavailable.', 'QueueService');
      return;
    }
    await this.queue(QUEUE_NAMES.notifications).add('deliver', data, {
      jobId,
      attempts: 5,
      backoff: { type: 'exponential', delay: 5_000 },
      removeOnComplete: 500,
      removeOnFail: 1_000,
    });
    this.metrics?.recordQueue(QUEUE_NAMES.notifications, 'enqueued');
  }

  async enqueueMaintenance(name: string, data: Record<string, unknown> = {}): Promise<void> {
    if (this.queues.length === 0) {
      this.logger.warn('Maintenance queue skipped because Redis is unavailable.', 'QueueService');
      return;
    }
    await this.queue(QUEUE_NAMES.maintenance).add(name, data, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 10_000 },
      removeOnComplete: 100,
      removeOnFail: 500,
    });
    this.metrics?.recordQueue(QUEUE_NAMES.maintenance, 'enqueued');
  }

  async onModuleDestroy(): Promise<void> {
    this.closePromise ??= this.close();
    await this.closePromise;
  }

  async isReady(): Promise<boolean> {
    if (this.closePromise || this.connection.status !== 'ready') return false;
    try {
      return (await this.connection.ping()) === 'PONG';
    } catch {
      return false;
    }
  }

  private async close(): Promise<void> {
    await Promise.all(this.workers.map((worker) => worker.close()));
    await Promise.all(this.queues.map((queue) => queue.close()));
    if (this.connection.status === 'ready') await this.connection.quit();
    else this.connection.disconnect();
  }

  private queue(name: string): Queue {
    const queue = this.queues.find((candidate) => candidate.name === name);
    if (!queue) throw new Error(`Queue ${name} is not initialized.`);
    return queue;
  }

  private async processNotification(job: Job): Promise<void> {
    await this.notificationOutbox.dispatchAvailable();
    this.logger.log(`Processed notification outbox job ${job.name}.`);
  }

  private async processMaintenance(job: Job): Promise<void> {
    if (job.name === 'purge-expired-auth-data') {
      const cutoff = retentionCutoff(new Date(), this.config.authSessionRetentionDays);
      await this.database.db.delete(authSessions).where(lt(authSessions.expiresAt, cutoff));
      await this.database.db.delete(otpRequests).where(lt(otpRequests.expiresAt, cutoff));
      await this.database.db
        .update(onboardingSessions)
        .set({ status: 'EXPIRED', updatedAt: new Date() })
        .where(
          and(
            eq(onboardingSessions.status, 'PENDING'),
            lt(onboardingSessions.expiresAt, new Date()),
          ),
        );
      this.logger.log('Purged expired authentication data according to retention policy.');
      return;
    }
    if (job.name === 'dispatch-notification-outbox') {
      await this.notificationOutbox.dispatchAvailable();
      return;
    }
    if (job.name === 'dispatch-sms-broadcasts') {
      await this.broadcasts.dispatchAvailable();
      return;
    }
    if (job.name === MAINTENANCE_JOB_NAMES.studentPhotoCleanup) {
      await this.studentPhotos.cleanupExpired();
      this.logger.log('Cleaned up expired and superseded student photos.');
      return;
    }
    this.logger.log(`Processed maintenance job ${job.name}.`);
  }
}

export function retentionCutoff(now: Date, retentionDays: number): Date {
  return new Date(now.getTime() - retentionDays * 24 * 60 * 60 * 1_000);
}
