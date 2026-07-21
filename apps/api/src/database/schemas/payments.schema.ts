import { pgTable, uuid, varchar, integer, timestamp, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { registrationPrices } from './pricing.schema';
import { users, adminUsers } from './auth.schema';

export const paymentPlans = pgTable('payment_plans', {
  id: uuid('id').defaultRandom().primaryKey(),
  registrationPriceId: uuid('registration_price_id').notNull().references(() => registrationPrices.id),
  planType: varchar('plan_type', { length: 30 }).notNull(),
  totalAmount: integer('total_amount').notNull(),
  prepaymentAmount: integer('prepayment_amount').notNull().default(0),
  remainingInstallmentAmount: integer('remaining_installment_amount').notNull().default(0),
  installmentCount: integer('installment_count').notNull().default(4),
  planStatus: varchar('plan_status', { length: 20 }).notNull().default('PENDING'),
  activatedAt: timestamp('activated_at', { withTimezone: true }),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  priceIdx: index('idx_plans_price').on(table.registrationPriceId),
}));

export const paymentScheduleItems = pgTable('payment_schedule_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  paymentPlanId: uuid('payment_plan_id').notNull().references(() => paymentPlans.id),
  itemType: varchar('item_type', { length: 20 }).notNull(),
  sequenceNumber: integer('sequence_number').notNull(),
  amount: integer('amount').notNull(),
  dueDate: timestamp('due_date', { withTimezone: true }),
  itemStatus: varchar('item_status', { length: 20 }).notNull().default('PENDING'),
  paidAmount: integer('paid_amount').notNull().default(0),
  paidAt: timestamp('paid_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  planIdx: index('idx_schedule_plan').on(table.paymentPlanId),
  dueDateIdx: index('idx_schedule_due_date').on(table.dueDate),
  statusIdx: index('idx_schedule_status').on(table.itemStatus),
  typeSequenceIdx: uniqueIndex('idx_schedule_type_seq').on(table.paymentPlanId, table.itemType, table.sequenceNumber),
}));

export const paymentTransactions = pgTable('payment_transactions', {
  id: uuid('id').defaultRandom().primaryKey(),
  paymentPlanId: uuid('payment_plan_id').notNull().references(() => paymentPlans.id),
  paymentScheduleItemId: uuid('payment_schedule_item_id').notNull().references(() => paymentScheduleItems.id),
  userId: uuid('user_id').references(() => users.id),
  amount: integer('amount').notNull(),
  paymentMethod: varchar('payment_method', { length: 30 }).notNull(),
  gatewayName: varchar('gateway_name', { length: 50 }),
  gatewayAuthority: varchar('gateway_authority', { length: 255 }),
  gatewayTransactionId: varchar('gateway_transaction_id', { length: 255 }),
  idempotencyKey: varchar('idempotency_key', { length: 255 }).unique(),
  transactionStatus: varchar('transaction_status', { length: 30 }).notNull().default('CREATED'),
  requestedAt: timestamp('requested_at', { withTimezone: true }).defaultNow().notNull(),
  verifiedAt: timestamp('verified_at', { withTimezone: true }),
  failureCode: varchar('failure_code', { length: 50 }),
  failureMessage: varchar('failure_message', { length: 500 }),
  recordedByAdminId: uuid('recorded_by_admin_id').references(() => adminUsers.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  scheduleItemIdx: index('idx_transactions_schedule_item').on(table.paymentScheduleItemId),
  statusIdx: index('idx_transactions_status').on(table.transactionStatus),
  idempotencyIdx: uniqueIndex('idx_transactions_idempotency').on(table.idempotencyKey),
}));
