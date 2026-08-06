import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  text,
  index,
  uniqueIndex,
  integer,
} from 'drizzle-orm/pg-core';
import { users } from './auth.schema';

export const notifications = pgTable(
  'notifications',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    eventId: varchar('event_id', { length: 255 }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    notificationType: varchar('notification_type', { length: 50 }).notNull(),
    channel: varchar('channel', { length: 20 }).notNull().default('IN_APP'),
    title: varchar('title', { length: 200 }).notNull(),
    message: text('message').notNull(),
    relatedEntityType: varchar('related_entity_type', { length: 50 }),
    relatedEntityId: uuid('related_entity_id'),
    notificationStatus: varchar('notification_status', { length: 20 }).notNull().default('PENDING'),
    scheduledAt: timestamp('scheduled_at', { withTimezone: true }),
    sentAt: timestamp('sent_at', { withTimezone: true }),
    failureReason: text('failure_reason'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    userIdx: index('idx_notifications_user').on(table.userId),
    statusIdx: index('idx_notifications_status').on(table.notificationStatus),
    eventIdx: uniqueIndex('idx_notifications_event').on(table.eventId),
  }),
);

export const notificationOutbox = pgTable(
  'notification_outbox',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    eventId: varchar('event_id', { length: 255 }).notNull(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    notificationType: varchar('notification_type', { length: 50 }).notNull(),
    title: varchar('title', { length: 200 }).notNull(),
    message: text('message').notNull(),
    relatedEntityType: varchar('related_entity_type', { length: 50 }),
    relatedEntityId: uuid('related_entity_id'),
    outboxStatus: varchar('outbox_status', { length: 20 }).notNull().default('PENDING'),
    attemptCount: integer('attempt_count').notNull().default(0),
    nextAttemptAt: timestamp('next_attempt_at', { withTimezone: true }).defaultNow().notNull(),
    lockedAt: timestamp('locked_at', { withTimezone: true }),
    deliveredAt: timestamp('delivered_at', { withTimezone: true }),
    failureCode: varchar('failure_code', { length: 80 }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    eventIdx: uniqueIndex('idx_notification_outbox_event').on(table.eventId),
    dispatchIdx: index('idx_notification_outbox_dispatch').on(
      table.outboxStatus,
      table.nextAttemptAt,
    ),
  }),
);
