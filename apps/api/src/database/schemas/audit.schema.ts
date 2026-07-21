import { pgTable, uuid, varchar, timestamp, text, index } from 'drizzle-orm/pg-core';

export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  actorType: varchar('actor_type', { length: 20 }).notNull(),
  actorId: uuid('actor_id').notNull(),
  action: varchar('action', { length: 50 }).notNull(),
  entityType: varchar('entity_type', { length: 50 }).notNull(),
  entityId: uuid('entity_id'),
  previousValues: text('previous_values'),
  newValues: text('new_values'),
  ipAddress: varchar('ip_address', { length: 50 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  entityTypeIdx: index('idx_audit_entity_type').on(table.entityType),
  entityIdIdx: index('idx_audit_entity_id').on(table.entityId),
  actorIdx: index('idx_audit_actor').on(table.actorId),
}));
