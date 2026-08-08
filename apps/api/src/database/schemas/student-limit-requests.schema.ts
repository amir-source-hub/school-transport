import {
  pgTable,
  uuid,
  varchar,
  integer,
  timestamp,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { users } from './auth.schema';
import { adminUsers } from './auth.schema';
import { sql } from 'drizzle-orm';

export const studentLimitRequests = pgTable(
  'student_limit_requests',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    currentLimit: integer('current_limit').notNull(),
    requestedLimit: integer('requested_limit').notNull(),
    reason: varchar('reason', { length: 500 }).notNull(),
    status: varchar('status', { length: 20 }).notNull().default('PENDING'),
    reviewedByAdminId: uuid('reviewed_by_admin_id').references(() => adminUsers.id),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
    rejectionReason: varchar('rejection_reason', { length: 500 }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    onePendingPerAccount: uniqueIndex('idx_limit_requests_one_pending')
      .on(table.userId)
      .where(sql`${table.status} = 'PENDING'`),
    userIdx: index('idx_limit_requests_user').on(table.userId),
    statusIdx: index('idx_limit_requests_status').on(table.status),
  }),
);
