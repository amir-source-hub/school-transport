import { Injectable, OnApplicationShutdown } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class GracefulShutdownService implements OnApplicationShutdown {
  constructor(private readonly database: DatabaseService) {}

  async onApplicationShutdown(signal?: string) {
    console.log(`Shutting down gracefully (signal: ${signal})...`);
    await this.database.onModuleDestroy();
    console.log('Database connections closed.');
  }
}
