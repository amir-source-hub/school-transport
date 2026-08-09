import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  text,
  boolean,
  index,
  uniqueIndex,
  integer,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { users } from './auth.schema';

export const NOTIFICATION_CONSENT_TEXT_VERSION = '2026-08-08.v1';

export const notificationConsents = pgTable(
  'notification_consents',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    channel: varchar('channel', { length: 20 }).notNull(),
    purpose: varchar('purpose', { length: 30 }).notNull(),
    granted: boolean('granted').notNull().default(false),
    textVersion: varchar('text_version', { length: 40 }).notNull(),
    source: varchar('source', { length: 30 }).notNull(),
    grantedAt: timestamp('granted_at', { withTimezone: true }),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    updatedBy: uuid('updated_by')
      .notNull()
      .references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    userPurposeChannelIdx: uniqueIndex('idx_notification_consents_user_purpose_channel').on(
      table.userId,
      table.purpose,
      table.channel,
    ),
    userIdx: index('idx_notification_consents_user').on(table.userId),
  }),
);

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
    purpose: varchar('purpose', { length: 30 }),
    providerMessageId: varchar('provider_message_id', { length: 100 }),
    title: varchar('title', { length: 200 }).notNull(),
    message: text('message').notNull(),
    relatedEntityType: varchar('related_entity_type', { length: 50 }),
    relatedEntityId: uuid('related_entity_id'),
    notificationStatus: varchar('notification_status', { length: 20 }).notNull().default('PENDING'),
    scheduledAt: timestamp('scheduled_at', { withTimezone: true }),
    sentAt: timestamp('sent_at', { withTimezone: true }),
    readAt: timestamp('read_at', { withTimezone: true }),
    failureReason: text('failure_reason'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    userIdx: index('idx_notifications_user').on(table.userId),
    statusIdx: index('idx_notifications_status').on(table.notificationStatus),
    eventIdx: uniqueIndex('idx_notifications_event').on(table.eventId),
    providerMessageIdx: index('idx_notifications_provider_message').on(table.providerMessageId),
    userChannelCreatedIdx: index('idx_notifications_user_channel_created').on(
      table.userId,
      table.channel,
      table.createdAt,
      table.id,
    ),
    userChannelUnreadIdx: index('idx_notifications_user_channel_unread')
      .on(table.userId, table.channel)
      .where(sql`read_at is null`),
    channelStatusCreatedIdx: index('idx_notifications_channel_status_created').on(
      table.channel,
      table.notificationStatus,
      table.createdAt,
    ),
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
