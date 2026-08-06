import { Pool } from 'pg';
import IORedis from 'ioredis';

async function checkWorkerReadiness() {
  if (!process.env.DATABASE_URL || !process.env.REDIS_URL) {
    throw new Error('Worker readiness requires explicit DATABASE_URL and REDIS_URL values.');
  }
  const timeout = boundedNumber(process.env.READINESS_TIMEOUT_MS, 2000, 100, 10000);
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 1,
    connectionTimeoutMillis: timeout,
    statement_timeout: timeout,
    query_timeout: timeout,
    ssl: process.env.PG_SSL_MODE === 'verify-full' ? { rejectUnauthorized: true } : false,
  });
  const redis = new IORedis(process.env.REDIS_URL, {
    lazyConnect: true,
    connectTimeout: timeout,
    maxRetriesPerRequest: 0,
    retryStrategy: () => null,
  });
  try {
    await Promise.all([pool.query('select 1'), redis.connect().then(() => redis.ping())]);
  } finally {
    await Promise.allSettled([pool.end(), redis.quit()]);
  }
}

function boundedNumber(value: string | undefined, fallback: number, min: number, max: number) {
  const parsed = Number(value ?? fallback);
  return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback;
}

checkWorkerReadiness().catch(() => {
  process.exitCode = 1;
});
