import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Pool } from 'pg';
import IORedis from 'ioredis';
import { Queue } from 'bullmq';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { randomUUID } from 'node:crypto';
import { drizzle } from 'drizzle-orm/node-postgres';
import { AppModule } from '../app.module';
import type { DatabaseService } from '../database/database.service';
import * as schema from '../database/schemas';
import { feedbackSubmissions, notifications, users } from '../database/schemas';
import { NotificationsService } from '../modules/notifications/notifications.service';
import { FeedbackService } from '../modules/feedback/feedback.service';
import { PaymentsService } from '../modules/payments/payments.service';

const databaseUrl = process.env.TEST_DATABASE_URL;
const redisUrl = process.env.REDIS_URL;
const enabled = Boolean(databaseUrl && redisUrl);

describe.skipIf(!enabled)('real PostgreSQL/Redis integration', () => {
  let pool: Pool;
  let redis: IORedis;
  let database: DatabaseService;

  beforeAll(() => {
    pool = new Pool({ connectionString: databaseUrl, max: 2 });
    redis = new IORedis(redisUrl!, { maxRetriesPerRequest: null });
    database = { db: drizzle(pool, { schema }) } as unknown as DatabaseService;
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

  it('enforces notification IDOR boundaries and snapshot-stable equal-time pagination', async () => {
    const userA = randomUUID();
    const userB = randomUUID();
    const firstId = randomUUID();
    const secondId = randomUUID();
    const foreignId = randomUUID();
    const insertedLaterId = randomUUID();
    const equalTime = new Date('2026-08-09T12:00:00.000Z');
    const audit = { record: async () => undefined, recordInTransaction: async () => undefined };
    const service = new NotificationsService(database, audit as never);
    try {
      await database.db.insert(users).values([
        { id: userA, username: `notification-a-${userA}` },
        { id: userB, username: `notification-b-${userB}` },
      ]);
      await database.db.insert(notifications).values([
        {
          id: firstId,
          userId: userA,
          notificationType: 'ENROLLMENT_APPROVED',
          title: 'first',
          message: 'first',
          createdAt: equalTime,
        },
        {
          id: secondId,
          userId: userA,
          notificationType: 'ENROLLMENT_APPROVED',
          title: 'second',
          message: 'second',
          createdAt: equalTime,
        },
        {
          id: foreignId,
          userId: userB,
          notificationType: 'ENROLLMENT_APPROVED',
          title: 'foreign',
          message: 'foreign',
          createdAt: equalTime,
        },
      ]);

      const pageOne = await service.getByUser(userA, { page: 1, pageSize: 1 });
      const expectedOrder = [firstId, secondId].sort().reverse();
      expect(pageOne.items.map(({ id }) => id)).toEqual(expectedOrder.slice(0, 1));
      expect(pageOne.total).toBe(2);
      await expect(service.markRead(foreignId, userA)).rejects.toMatchObject({ status: 404 });

      await database.db.insert(notifications).values({
        id: insertedLaterId,
        userId: userA,
        notificationType: 'ENROLLMENT_APPROVED',
        title: 'later',
        message: 'later',
        createdAt: new Date(Date.parse(pageOne.snapshotAt) + 1_000),
      });
      const pageTwo = await service.getByUser(userA, {
        page: 2,
        pageSize: 1,
        snapshotAt: pageOne.snapshotAt,
      });
      expect(pageTwo.items.map(({ id }) => id)).toEqual(expectedOrder.slice(1));
      expect(pageTwo.total).toBe(2);

      await service.markAllRead(userA);
      const foreignRead = await pool.query<{ read_at: Date | null }>(
        'select read_at from notifications where id = $1',
        [foreignId],
      );
      expect(foreignRead.rows[0].read_at).toBeNull();
    } finally {
      await pool.query('delete from notifications where user_id = any($1::uuid[])', [
        [userA, userB],
      ]);
      await pool.query('delete from users where id = any($1::uuid[])', [[userA, userB]]);
    }
  });

  it('enforces feedback IDOR, filters, empty pages, and snapshot-stable inserts', async () => {
    const userA = randomUUID();
    const userB = randomUUID();
    const feedbackA = randomUUID();
    const feedbackB = randomUUID();
    const later = randomUUID();
    const service = new FeedbackService(
      database,
      {} as never,
      { record: async () => undefined, recordInTransaction: async () => undefined } as never,
    );
    try {
      await database.db.insert(users).values([
        { id: userA, username: `feedback-a-${userA}` },
        { id: userB, username: `feedback-b-${userB}` },
      ]);
      await database.db.insert(feedbackSubmissions).values([
        {
          id: feedbackA,
          userId: userA,
          category: 'SAFETY',
          subject: 'safety issue',
          message: 'a sufficiently long safety message',
          status: 'ESCALATED',
          priority: 'URGENT',
        },
        {
          id: feedbackB,
          userId: userB,
          category: 'APP',
          subject: 'foreign issue',
          message: 'a sufficiently long foreign message',
        },
      ]);

      const mine = await service.listMine(userA, { page: 1, pageSize: 5 } as never);
      expect(mine.items.map(({ id }) => id)).toEqual([feedbackA]);
      expect(mine.total).toBe(1);
      const filtered = await service.listAdmin(
        { page: 1, pageSize: 5, status: 'ESCALATED', category: 'SAFETY' } as never,
        randomUUID(),
      );
      expect(filtered.items.map(({ id }) => id)).toEqual([feedbackA]);
      const empty = await service.listMine(userA, {
        page: 2,
        pageSize: 5,
        snapshotAt: mine.snapshotAt,
      } as never);
      expect(empty.items).toEqual([]);

      await database.db.insert(feedbackSubmissions).values({
        id: later,
        userId: userA,
        category: 'APP',
        subject: 'later issue',
        message: 'a sufficiently long later message',
        createdAt: new Date(Date.parse(mine.snapshotAt) + 1_000),
      });
      const stable = await service.listMine(userA, {
        page: 1,
        pageSize: 5,
        snapshotAt: mine.snapshotAt,
      } as never);
      expect(stable.items.map(({ id }) => id)).toEqual([feedbackA]);
      expect(stable.total).toBe(1);
    } finally {
      await pool.query('delete from feedback_submissions where user_id = any($1::uuid[])', [
        [userA, userB],
      ]);
      await pool.query('delete from users where id = any($1::uuid[])', [[userA, userB]]);
    }
  });

  it('allows only one current approved photo under concurrent PostgreSQL updates', async () => {
    const userId = randomUUID();
    const schoolId = randomUUID();
    const studentId = randomUUID();
    const photoA = randomUUID();
    const photoB = randomUUID();
    const approve = async (photoId: string) => {
      const client = await pool.connect();
      try {
        await client.query('begin');
        await client.query(
          `update student_photo_uploads
             set status = 'APPROVED', approved_at = now(), updated_at = now()
           where id = $1`,
          [photoId],
        );
        await client.query('commit');
        return 'approved';
      } catch (error) {
        await client.query('rollback');
        throw error;
      } finally {
        client.release();
      }
    };
    try {
      await pool.query('insert into users (id, username) values ($1, $2)', [
        userId,
        `photo-user-${userId}`,
      ]);
      await pool.query(
        `insert into schools (id, name, province, city, address)
         values ($1, 'integration school', 'Tehran', 'Tehran', 'integration')`,
        [schoolId],
      );
      await pool.query(
        `insert into students (id, user_id, school_id, first_name, last_name, national_id)
         values ($1, $2, $3, 'photo', 'student', $4)`,
        [studentId, userId, schoolId, userId.replaceAll('-', '').slice(0, 10)],
      );
      for (const [photoId, suffix] of [
        [photoA, 'a'],
        [photoB, 'b'],
      ] as const) {
        await pool.query(
          `insert into student_photo_uploads
             (id, account_user_id, student_id, raw_key, canonical_key, declared_mime,
              declared_size, actual_mime, actual_size, width, height, checksum, status,
              upload_authorization_expiry)
           values ($1, $2, $3, $4, $5, 'image/jpeg', 100, 'image/jpeg', 100,
                   600, 800, $6, 'PENDING_REVIEW', now() + interval '5 minutes')`,
          [
            photoId,
            userId,
            studentId,
            `student-photos/raw/${suffix}.jpg`,
            `student-photos/canonical/${suffix}.jpg`,
            suffix.repeat(64),
          ],
        );
      }

      const outcomes = await Promise.allSettled([approve(photoA), approve(photoB)]);
      expect(outcomes.filter(({ status }) => status === 'fulfilled')).toHaveLength(1);
      expect(outcomes.filter(({ status }) => status === 'rejected')).toHaveLength(1);
      const approved = await pool.query<{ count: string }>(
        `select count(*) from student_photo_uploads
         where student_id = $1 and status = 'APPROVED'`,
        [studentId],
      );
      expect(approved.rows[0].count).toBe('1');
    } finally {
      await pool.query('delete from student_photo_uploads where student_id = $1', [studentId]);
      await pool.query('delete from students where id = $1', [studentId]);
      await pool.query('delete from schools where id = $1', [schoolId]);
      await pool.query('delete from users where id = $1', [userId]);
    }
  });

  it('enforces offline-payment ownership, one active claim, and exact-once concurrent approval', async () => {
    const ownerId = randomUUID();
    const foreignId = randomUUID();
    const adminId = randomUUID();
    const schoolId = randomUUID();
    const studentId = randomUUID();
    const registrationId = randomUUID();
    const priceId = randomUUID();
    const planId = randomUUID();
    const itemId = randomUUID();
    const installmentId = randomUUID();
    const destinationId = randomUUID();
    const service = new PaymentsService(
      database,
      {} as never,
      { enqueueInTransaction: async () => 'integration-event' } as never,
      { record: async () => undefined, recordInTransaction: async () => undefined } as never,
    );
    const input = (key: string) => ({
      paidAt: new Date(Date.now() - 60_000).toISOString(),
      referenceNumber: `reference-${key}`,
      idempotencyKey: key,
    });
    try {
      await pool.query(`insert into users (id, username) values ($1, $2), ($3, $4)`, [
        ownerId,
        `payment-owner-${ownerId}`,
        foreignId,
        `payment-foreign-${foreignId}`,
      ]);
      await pool.query(
        `insert into admin_users (id, username, first_name, last_name, phone_number)
         values ($1, $2, 'integration', 'admin', $3)`,
        [adminId, `payment-admin-${adminId}`, `09${adminId.replaceAll('-', '').slice(0, 9)}`],
      );
      await pool.query(
        `insert into schools (id, name, province, city, address)
         values ($1, 'payment school', 'Tehran', 'Tehran', 'integration')`,
        [schoolId],
      );
      await pool.query(
        `insert into students (id, user_id, school_id, first_name, last_name, national_id)
         values ($1, $2, $3, 'payment', 'student', $4)`,
        [studentId, ownerId, schoolId, ownerId.replaceAll('-', '').slice(0, 10)],
      );
      await pool.query(
        `insert into service_registrations
           (id, student_id, academic_year, service_type, registration_status)
         values ($1, $2, '1405-1406', 'ROUND_TRIP', 'APPROVED')`,
        [registrationId, studentId],
      );
      await pool.query(
        `insert into registration_prices
           (id, registration_id, total_amount, prepayment_amount, installment_count, price_status)
         values ($1, $2, 2000, 1000, 1, 'ACCEPTED')`,
        [priceId, registrationId],
      );
      await pool.query(
        `insert into payment_plans
           (id, registration_price_id, plan_type, total_amount, prepayment_amount,
            remaining_installment_amount, installment_count)
         values ($1, $2, 'ADMIN_CONFIGURED', 2000, 1000, 1000, 1)`,
        [planId, priceId],
      );
      await pool.query(
        `insert into payment_schedule_items
           (id, payment_plan_id, item_type, sequence_number, amount)
         values ($1, $2, 'PREPAYMENT', 0, 1000),
                ($3, $2, 'INSTALLMENT', 1, 1000)`,
        [itemId, planId, installmentId],
      );
      await pool.query(
        `insert into offline_payment_destinations
           (id, version, account_owner, bank_name, card_number, instructions,
            created_by_admin_id)
         values ($1, 900001, 'integration', 'integration bank', '1234567890123456',
                 'integration only', $2)`,
        [destinationId, adminId],
      );

      await expect(
        service.createOfflineSubmission(itemId, foreignId, input('foreign-key')),
      ).rejects.toMatchObject({ status: 404 });
      await expect(
        service.createOfflineSubmission(installmentId, foreignId, input('foreign-installment')),
      ).rejects.toMatchObject({ status: 404 });

      const duplicate = await Promise.allSettled([
        service.createOfflineSubmission(itemId, ownerId, input('concurrent-a')),
        service.createOfflineSubmission(itemId, ownerId, input('concurrent-b')),
      ]);
      expect(duplicate.filter(({ status }) => status === 'fulfilled')).toHaveLength(1);
      expect(duplicate.filter(({ status }) => status === 'rejected')).toHaveLength(1);
      const submissionId = duplicate.find(
        (result): result is PromiseFulfilledResult<string> => result.status === 'fulfilled',
      )!.value;
      const replayKey = await pool.query<{ idempotency_key: string }>(
        'select idempotency_key from offline_payment_submissions where id = $1',
        [submissionId],
      );
      await expect(
        service.createOfflineSubmission(itemId, ownerId, input(replayKey.rows[0].idempotency_key)),
      ).resolves.toBe(submissionId);

      await pool.query(
        `update offline_payment_submissions
         set status = 'PENDING_REVIEW', receipt_object_key = 'payment-receipts/canonical/integration.jpg',
             receipt_checksum = $2, receipt_mime = 'image/jpeg', receipt_size = 100,
             receipt_width = 600, receipt_height = 800
         where id = $1`,
        [submissionId, 'a'.repeat(64)],
      );
      const approvals = await Promise.allSettled([
        service.approveOfflinePayment(submissionId, adminId, 1),
        service.approveOfflinePayment(submissionId, adminId, 1),
      ]);
      expect(approvals.filter(({ status }) => status === 'fulfilled')).toHaveLength(1);
      expect(approvals.filter(({ status }) => status === 'rejected')).toHaveLength(1);
      const financial = await pool.query<{
        transaction_count: string;
        item_status: string;
        paid_amount: number;
      }>(
        `select count(t.id)::text as transaction_count, i.item_status, i.paid_amount
         from payment_schedule_items i
         left join payment_transactions t on t.payment_schedule_item_id = i.id
         where i.id = $1
         group by i.item_status, i.paid_amount`,
        [itemId],
      );
      expect(financial.rows[0]).toEqual({
        transaction_count: '1',
        item_status: 'PAID',
        paid_amount: 1000,
      });
    } finally {
      await pool.query('delete from payment_transactions where payment_schedule_item_id = $1', [
        itemId,
      ]);
      await pool.query(
        'delete from offline_payment_submissions where payment_schedule_item_id = $1',
        [itemId],
      );
      await pool.query('delete from payment_schedule_items where payment_plan_id = $1', [planId]);
      await pool.query('delete from payment_plans where id = $1', [planId]);
      await pool.query('delete from registration_prices where id = $1', [priceId]);
      await pool.query('delete from service_registrations where id = $1', [registrationId]);
      await pool.query('delete from students where id = $1', [studentId]);
      await pool.query('delete from offline_payment_destinations where id = $1', [destinationId]);
      await pool.query('delete from schools where id = $1', [schoolId]);
      await pool.query('delete from admin_users where id = $1', [adminId]);
      await pool.query('delete from users where id = any($1::uuid[])', [[ownerId, foreignId]]);
    }
  });
});
