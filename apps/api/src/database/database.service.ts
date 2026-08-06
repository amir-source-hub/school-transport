import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Pool } from 'pg';
import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import { ConfigService } from '../config/config.service';
import * as schema from './schemas';
import { sql } from 'drizzle-orm';

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  readonly db: NodePgDatabase<typeof schema>;
  private pool: Pool;
  private closePromise?: Promise<void>;

  constructor(config: ConfigService) {
    this.pool = new Pool({
      connectionString: config.databaseUrl,
      max: config.pgPoolMax,
      idleTimeoutMillis: config.pgIdleTimeoutMs,
      connectionTimeoutMillis: config.pgConnectTimeoutMs,
      statement_timeout: config.pgStatementTimeoutMs,
      query_timeout: config.pgStatementTimeoutMs,
      ssl: config.pgSslMode === 'verify-full' ? { rejectUnauthorized: true } : false,
    });
    this.db = drizzle(this.pool, { schema });
  }

  async onModuleDestroy() {
    this.closePromise ??= this.pool.end();
    await this.closePromise;
  }

  async isReady(): Promise<boolean> {
    if (this.closePromise) return false;
    try {
      await this.db.execute(sql`select 1`);
      return true;
    } catch {
      return false;
    }
  }
}
