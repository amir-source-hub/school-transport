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
  private bufferFullReported = false;
  private readonly timer: NodeJS.Timeout;

  constructor(
    private readonly database: DatabaseService,
    private readonly logger: AppLogger,
  ) {
    this.timer = setInterval(() => this.requestFlush(), FLUSH_INTERVAL_MS);
    this.timer.unref();
  }

  enqueue(record: HttpActivityRecord): void {
    if (this.pending.length >= MAX_BUFFER_SIZE) {
      this.reportFullBuffer();
      this.requestFlush();
      return;
    }
    this.pending.push(record);
    if (this.pending.length >= MAX_BATCH_SIZE) this.requestFlush();
  }

  async flush(): Promise<void> {
    if (this.flushing) return this.flushing;
    if (this.pending.length === 0) return;
    let succeeded = false;
    this.flushing = this.flushBatches()
      .then(() => {
        succeeded = true;
        this.bufferFullReported = false;
      })
      .finally(() => {
        this.flushing = undefined;
        // Retry failures on the interval instead of spinning in a hot loop while
        // the database is unavailable. Records that arrived during a successful
        // flush can be drained immediately.
        if (succeeded && this.pending.length > 0) this.requestFlush();
      });
    return this.flushing;
  }

  private requestFlush(): void {
    // flushBatches logs failures and restores the failed batch. Contain the
    // rejection here so a best-effort observability write can never terminate
    // the API through an unhandled promise rejection.
    void this.flush().catch(() => undefined);
  }

  private reportFullBuffer(): void {
    if (this.bufferFullReported) return;
    this.bufferFullReported = true;
    this.logger.error(
      'HTTP activity buffer is full; dropping new observability records until persistence recovers.',
      undefined,
      HttpActivityService.name,
    );
  }

  private async flushBatches(): Promise<void> {
    while (this.pending.length > 0) {
      const batch = this.pending.splice(0, MAX_BATCH_SIZE);
      try {
        await this.database.db.insert(httpActivityLogs).values(batch);
      } catch (error) {
        const combined = [...batch, ...this.pending];
        this.pending = combined.slice(0, MAX_BUFFER_SIZE);
        if (combined.length > MAX_BUFFER_SIZE) this.reportFullBuffer();
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
    await this.flush().catch(() => undefined);
  }
}
