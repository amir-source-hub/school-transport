import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { httpActivityLogs } from '../database/schemas';
import { AppLogger } from './logger';

export type HttpActivityRecord = typeof httpActivityLogs.$inferInsert;

const FLUSH_INTERVAL_MS = 250;
const MAX_BATCH_SIZE = 250;
const MAX_BUFFER_SIZE = 20_000;

@Injectable()
export class HttpActivityService implements OnModuleDestroy {
  private pending: HttpActivityRecord[] = [];
  private flushing?: Promise<void>;
  private readonly timer: NodeJS.Timeout;

  constructor(
    private readonly database: DatabaseService,
    private readonly logger: AppLogger,
  ) {
    this.timer = setInterval(() => void this.flush(), FLUSH_INTERVAL_MS);
    this.timer.unref();
  }

  enqueue(record: HttpActivityRecord): void {
    if (this.pending.length >= MAX_BUFFER_SIZE) {
      this.logger.error(
        'HTTP activity buffer is full; refusing to silently discard observability records.',
        undefined,
        HttpActivityService.name,
      );
      void this.flush();
    }
    this.pending.push(record);
    if (this.pending.length >= MAX_BATCH_SIZE) void this.flush();
  }

  async flush(): Promise<void> {
    if (this.flushing) return this.flushing;
    if (this.pending.length === 0) return;
    let succeeded = false;
    this.flushing = this.flushBatches()
      .then(() => {
        succeeded = true;
      })
      .finally(() => {
        this.flushing = undefined;
        // Retry failures on the interval instead of spinning in a hot loop while
        // the database is unavailable. Records that arrived during a successful
        // flush can be drained immediately.
        if (succeeded && this.pending.length > 0) void this.flush();
      });
    return this.flushing;
  }

  private async flushBatches(): Promise<void> {
    while (this.pending.length > 0) {
      const batch = this.pending.splice(0, MAX_BATCH_SIZE);
      try {
        await this.database.db.insert(httpActivityLogs).values(batch);
      } catch (error) {
        this.pending.unshift(...batch);
        this.logger.error(
          'Failed to persist HTTP activity batch.',
          error instanceof Error ? error.stack : undefined,
          HttpActivityService.name,
        );
        throw error;
      }
    }
  }

  async onModuleDestroy(): Promise<void> {
    clearInterval(this.timer);
    await this.flush();
  }
}
