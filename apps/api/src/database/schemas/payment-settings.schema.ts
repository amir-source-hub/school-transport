import { check, integer, pgTable, timestamp, uuid } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { adminUsers } from './auth.schema';

export const paymentSettings = pgTable('payment_settings', {
  id: integer('id').primaryKey().default(1),
  defaultPrepaymentAmount: integer('default_prepayment_amount').notNull(),
  version: integer('version').notNull().default(1),
  updatedByAdminId: uuid('updated_by_admin_id').references(() => adminUsers.id),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  singleton: check('payment_settings_singleton', sql`${table.id} = 1`),
  amountPositive: check('payment_settings_amount_positive', sql`${table.defaultPrepaymentAmount} > 0`),
}));
