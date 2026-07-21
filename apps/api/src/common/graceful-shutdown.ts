import { Injectable, OnApplicationShutdown } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { AppLogger } from './logger';

@Injectable()
export class GracefulShutdownService implements OnApplicationShutdown {
  constructor(
    private readonly database: DatabaseService,
    private readonly logger: AppLogger,
  ) {}

  async onApplicationShutdown(signal?: string) {
    this.logger.log(
      { event: 'application_shutdown_started', signal },
      GracefulShutdownService.name,
    );
    await this.database.onModuleDestroy();
    this.logger.log({ event: 'database_connections_closed' }, GracefulShutdownService.name);
  }
}
