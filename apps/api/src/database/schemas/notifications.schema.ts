import { pgTable, uuid, varchar, timestamp, text, index } from 'drizzle-orm/pg-core';
import { users } from './auth.schema';

export const notifications = pgTable(
  'notifications',
  {
    id: uuid('id').defaultRandom().primaryKey(),
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
  }),
);
