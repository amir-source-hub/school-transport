import { Injectable, OnApplicationShutdown } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { AppLogger } from './logger';
import { ReadinessState } from './readiness-state';
import { QueueService } from '../infrastructure/queue/queue.service';

@Injectable()
export class GracefulShutdownService implements OnApplicationShutdown {
  constructor(
    private readonly database: DatabaseService,
    private readonly logger: AppLogger,
    private readonly readiness: ReadinessState,
    private readonly queue: QueueService,
  ) {}

  private shutdownPromise?: Promise<void>;

  async onApplicationShutdown(signal?: string) {
    this.shutdownPromise ??= this.shutdown(signal);
    await this.shutdownPromise;
  }

  private async shutdown(signal?: string) {
    this.readiness.beginDraining();
    this.logger.log({ event: 'application_shutdown_started', signal }, GracefulShutdownService.name);
    await this.queue.onModuleDestroy();
    this.logger.log({ event: 'queue_workers_drained' }, GracefulShutdownService.name);
    await this.database.onModuleDestroy();
    this.logger.log({ event: 'database_connections_closed' }, GracefulShutdownService.name);
  }
}
