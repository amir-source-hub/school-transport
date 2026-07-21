import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Job, Queue, Worker } from 'bullmq';
import IORedis from 'ioredis';
import { ConfigService } from '../../config/config.service';
import { AppLogger } from '../../common/logger';
import { DatabaseService } from '../../database/database.service';
import { authSessions, otpRequests } from '../../database/schemas';
import { lt } from 'drizzle-orm';

export const QUEUE_NAMES = {
  notifications: 'notification-delivery',
  maintenance: 'maintenance',
} as const;

@Injectable()
export class QueueService implements OnModuleInit, OnModuleDestroy {
  private readonly connection: IORedis;
  private readonly queues: Queue[] = [];
  private readonly workers: Worker[] = [];

  constructor(
    private readonly config: ConfigService,
    private readonly logger: AppLogger,
    private readonly database: DatabaseService,
  ) {
    this.connection = new IORedis(config.redisUrl, {
      maxRetriesPerRequest: null,
      enableReadyCheck: true,
    });
  }

  async onModuleInit(): Promise<void> {
    await this.connection.ping();
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
    }
  }

  async enqueueNotification(data: Record<string, unknown>, jobId: string): Promise<void> {
    await this.queue(QUEUE_NAMES.notifications).add('deliver', data, {
      jobId,
      attempts: 5,
      backoff: { type: 'exponential', delay: 5_000 },
      removeOnComplete: 500,
      removeOnFail: 1_000,
    });
  }

  async enqueueMaintenance(name: string, data: Record<string, unknown> = {}): Promise<void> {
    await this.queue(QUEUE_NAMES.maintenance).add(name, data, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 10_000 },
      removeOnComplete: 100,
      removeOnFail: 500,
    });
  }

  async onModuleDestroy(): Promise<void> {
    await Promise.all(this.workers.map((worker) => worker.close()));
    await Promise.all(this.queues.map((queue) => queue.close()));
    await this.connection.quit();
  }

  private queue(name: string): Queue {
    const queue = this.queues.find((candidate) => candidate.name === name);
    if (!queue) throw new Error(`Queue ${name} is not initialized.`);
    return queue;
  }

  private async processNotification(job: Job): Promise<void> {
    this.logger.log(`Processed development notification job ${job.name}.`);
  }

  private async processMaintenance(job: Job): Promise<void> {
    if (job.name === 'purge-expired-auth-data') {
      const cutoff = retentionCutoff(new Date(), this.config.authSessionRetentionDays);
      await this.database.db.delete(authSessions).where(lt(authSessions.expiresAt, cutoff));
      await this.database.db.delete(otpRequests).where(lt(otpRequests.expiresAt, cutoff));
      this.logger.log('Purged expired authentication data according to retention policy.');
      return;
    }
    this.logger.log(`Processed maintenance job ${job.name}.`);
  }
}

export function retentionCutoff(now: Date, retentionDays: number): Date {
  return new Date(now.getTime() - retentionDays * 24 * 60 * 60 * 1_000);
}
