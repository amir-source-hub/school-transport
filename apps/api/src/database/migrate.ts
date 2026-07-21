import { resolve } from 'node:path';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';

export async function migrateDatabase(databaseUrl = process.env.DATABASE_URL): Promise<void> {
  if (!databaseUrl) throw new Error('DATABASE_URL is required for migrations.');
  const pool = new Pool({ connectionString: databaseUrl, max: 1 });
  try {
    await migrate(drizzle(pool), { migrationsFolder: resolve('drizzle') });
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  migrateDatabase()
    .then(() => console.log('Database migrations are current.'))
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    });
}
