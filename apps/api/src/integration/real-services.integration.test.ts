import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Pool } from 'pg';
import IORedis from 'ioredis';
import { Queue } from 'bullmq';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from '../app.module';

const databaseUrl = process.env.TEST_DATABASE_URL;
const redisUrl = process.env.REDIS_URL;
const enabled = Boolean(databaseUrl && redisUrl);

describe.skipIf(!enabled)('real PostgreSQL/Redis integration', () => {
  let pool: Pool;
  let redis: IORedis;

  beforeAll(() => {
    pool = new Pool({ connectionString: databaseUrl, max: 2 });
    redis = new IORedis(redisUrl!, { maxRetriesPerRequest: null });
  });

  afterAll(async () => {
    await Promise.all([pool.end(), redis.quit()]);
  });

  it('runs against the migrated schema and proves transaction rollback', async () => {
    const schema = await pool.query<{ users: string | null; migrations: string | null }>(
      `select to_regclass('public.users')::text as users,
              to_regclass('drizzle.__drizzle_migrations')::text as migrations`,
    );
    expect(schema.rows[0]).toEqual({
      users: 'users',
      migrations: 'drizzle.__drizzle_migrations',
    });

    const client = await pool.connect();
    try {
      await client.query('create temporary table rollback_probe (value integer)');
      await client.query('begin');
      await client.query('insert into rollback_probe (value) values (1)');
      await client.query('rollback');
      const result = await client.query<{ count: string }>('select count(*) from rollback_probe');
      expect(result.rows[0].count).toBe('0');
    } finally {
      client.release();
    }
  });

  it('persists a BullMQ job across queue client restart', async () => {
    const queueName = `ci-restart-${process.pid}-${Date.now()}`;
    const first = new Queue(queueName, { connection: redis });
    await first.add('probe', { correlationId: 'restart-proof' }, { jobId: 'stable-job' });
    await first.close();

    const second = new Queue(queueName, { connection: redis });
    try {
      const restored = await second.getJob('stable-job');
      expect(restored?.data).toEqual({ correlationId: 'restart-proof' });
      expect(await second.count()).toBe(1);
    } finally {
      await second.obliterate({ force: true });
      await second.close();
    }
  });

  it('boots the real Nest module graph and serves the liveness HTTP contract', async () => {
    const app = await NestFactory.create<NestFastifyApplication>(
      AppModule,
      new FastifyAdapter({ logger: false }),
      { logger: false },
    );
    app.setGlobalPrefix('api/v1');
    await app.init();
    try {
      const response = await app.inject({ method: 'GET', url: '/api/v1/health' });
      expect(response.statusCode).toBe(200);
      expect(response.json()).toMatchObject({ status: 'ok' });
    } finally {
      await app.close();
    }
  });
});
