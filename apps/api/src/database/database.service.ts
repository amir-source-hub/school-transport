import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Pool } from 'pg';
import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import { ConfigService } from '../config/config.service';
import * as schema from './schemas';

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  readonly db: NodePgDatabase<typeof schema>;
  private pool: Pool;

  constructor(config: ConfigService) {
    this.pool = new Pool({ connectionString: config.databaseUrl });
    this.db = drizzle(this.pool, { schema });
  }

  async onModuleDestroy() {
    await this.pool.end();
  }
}
