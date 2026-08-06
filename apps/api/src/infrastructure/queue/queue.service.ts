import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Job, Queue, Worker } from 'bullmq';
import IORedis from 'ioredis';
import { ConfigService } from '../../config/config.service';
import { AppLogger } from '../../common/logger';
import { DatabaseService } from '../../database/database.service';
import { authSessions, otpRequests } from '../../database/schemas';
import { lt } from 'drizzle-orm';
import { InAppNotificationService } from '../notifications/in-app-notification.service';

export const QUEUE_NAMES = {
  notifications: 'notification-delivery',
  maintenance: 'maintenance',
} as const;

@Injectable()
export class QueueService implements OnModuleInit, OnModuleDestroy {
  private readonly connection: IORedis;
  private readonly queues: Queue[] = [];
  private readonly workers: Worker[] = [];
  private closePromise?: Promise<void>;

  constructor(
    private readonly config: ConfigService,
    private readonly logger: AppLogger,
    private readonly database: DatabaseService,
    private readonly notificationOutbox: InAppNotificationService,
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
      this.logger.log('BullMQ workers started.');
      await this.queue(QUEUE_NAMES.maintenance).add(
        'purge-expired-auth-data',
        {},
        {
          jobId: 'scheduled-auth-retention',
          repeat: { pattern: '15 3 * * *' },
          removeOnComplete: 30,
          removeOnFail: 100,
        },
      );
      await this.queue(QUEUE_NAMES.maintenance).add(
        'dispatch-notification-outbox',
        {},
        {
          jobId: 'scheduled-notification-outbox',
          repeat: { every: 5_000 },
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
      this.logger.log('Purged expired authentication data according to retention policy.');
      return;
    }
    if (job.name === 'dispatch-notification-outbox') {
      await this.notificationOutbox.dispatchAvailable();
      return;
    }
    this.logger.log(`Processed maintenance job ${job.name}.`);
  }
}

export function retentionCutoff(now: Date, retentionDays: number): Date {
  return new Date(now.getTime() - retentionDays * 24 * 60 * 60 * 1_000);
}
