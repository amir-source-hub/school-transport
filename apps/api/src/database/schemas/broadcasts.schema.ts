import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { adminUsers, users } from './auth.schema';

export const smsBroadcasts = pgTable(
  'sms_broadcasts',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: varchar('name', { length: 120 }).notNull(),
    smsContent: text('sms_content').notNull(),
    inAppTitle: varchar('in_app_title', { length: 200 }),
    inAppContent: text('in_app_content'),
    audience: jsonb('audience').$type<{ accountStatus: 'ACTIVE' }>().notNull(),
    approvedSnapshot: jsonb('approved_snapshot'),
    status: varchar('status', { length: 30 }).notNull().default('DRAFT'),
    featureEnabled: boolean('feature_enabled').notNull().default(false),
    segmentCount: integer('segment_count').notNull(),
    estimatedRecipients: integer('estimated_recipients').notNull().default(0),
    estimatedCostRial: integer('estimated_cost_rial').notNull().default(0),
    creatorId: uuid('creator_id').notNull().references(() => adminUsers.id),
    approverId: uuid('approver_id').references(() => adminUsers.id),
    scheduledAt: timestamp('scheduled_at', { withTimezone: true }).notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    approvedAt: timestamp('approved_at', { withTimezone: true }),
    cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    statusScheduleIdx: index('idx_sms_broadcasts_status_schedule').on(
      table.status,
      table.scheduledAt,
    ),
    creatorIdx: index('idx_sms_broadcasts_creator').on(table.creatorId),
  }),
);

export const smsBroadcastRecipients = pgTable(
  'sms_broadcast_recipients',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    broadcastId: uuid('broadcast_id').notNull().references(() => smsBroadcasts.id),
    userId: uuid('user_id').notNull().references(() => users.id),
    normalizedPhone: varchar('normalized_phone', { length: 20 }).notNull(),
    status: varchar('status', { length: 30 }).notNull().default('QUEUED'),
    providerMessageId: varchar('provider_message_id', { length: 100 }),
    attemptCount: integer('attempt_count').notNull().default(0),
    nextAttemptAt: timestamp('next_attempt_at', { withTimezone: true }).defaultNow().notNull(),
    sentAt: timestamp('sent_at', { withTimezone: true }),
    failureCode: varchar('failure_code', { length: 80 }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    broadcastUserIdx: uniqueIndex('idx_sms_broadcast_recipient_user').on(
      table.broadcastId,
      table.userId,
    ),
    broadcastPhoneIdx: uniqueIndex('idx_sms_broadcast_recipient_phone').on(
      table.broadcastId,
      table.normalizedPhone,
    ),
    dispatchIdx: index('idx_sms_broadcast_recipient_dispatch').on(
      table.broadcastId,
      table.status,
      table.nextAttemptAt,
    ),
  }),
);
