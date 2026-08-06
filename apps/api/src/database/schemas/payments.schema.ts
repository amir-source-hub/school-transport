import {
  pgTable,
  uuid,
  varchar,
  integer,
  timestamp,
  index,
  uniqueIndex,
  check,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { registrationPrices } from './pricing.schema';
import { users, adminUsers } from './auth.schema';

export const paymentPlans = pgTable(
  'payment_plans',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    registrationPriceId: uuid('registration_price_id')
      .notNull()
      .references(() => registrationPrices.id),
    planType: varchar('plan_type', { length: 50 }).notNull(),
    totalAmount: integer('total_amount').notNull(),
    prepaymentAmount: integer('prepayment_amount').notNull().default(0),
    remainingInstallmentAmount: integer('remaining_installment_amount').notNull().default(0),
    installmentCount: integer('installment_count').notNull().default(4),
    planStatus: varchar('plan_status', { length: 20 }).notNull().default('PENDING'),
    activatedAt: timestamp('activated_at', { withTimezone: true }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    priceIdx: uniqueIndex('idx_plans_price_unique').on(table.registrationPriceId),
    positiveTotalAmount: check(
      'payment_plans_total_amount_positive',
      sql`${table.totalAmount} > 0`,
    ),
    nonNegativePrepayment: check(
      'payment_plans_prepayment_non_negative',
      sql`${table.prepaymentAmount} >= 0`,
    ),
    nonNegativeRemainingAmount: check(
      'payment_plans_remaining_amount_non_negative',
      sql`${table.remainingInstallmentAmount} >= 0`,
    ),
    amountBalance: check(
      'payment_plans_amount_balance',
      sql`${table.totalAmount} = ${table.prepaymentAmount} + ${table.remainingInstallmentAmount}`,
    ),
    installmentStructure: check(
      'payment_plans_installment_structure',
      sql`(${table.planType} = 'FULL' AND ${table.installmentCount} = 1) OR (${table.planType} IN ('PREPAYMENT_PLUS_FOUR_INSTALLMENTS', 'ADMIN_CONFIGURED') AND ${table.installmentCount} BETWEEN 1 AND 12)`,
    ),
  }),
);

export const paymentScheduleItems = pgTable(
  'payment_schedule_items',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    paymentPlanId: uuid('payment_plan_id')
      .notNull()
      .references(() => paymentPlans.id),
    itemType: varchar('item_type', { length: 20 }).notNull(),
    sequenceNumber: integer('sequence_number').notNull(),
    amount: integer('amount').notNull(),
    dueDate: timestamp('due_date', { withTimezone: true }),
    itemStatus: varchar('item_status', { length: 20 }).notNull().default('PENDING'),
    paidAmount: integer('paid_amount').notNull().default(0),
    paidAt: timestamp('paid_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    planIdx: index('idx_schedule_plan').on(table.paymentPlanId),
    dueDateIdx: index('idx_schedule_due_date').on(table.dueDate),
    statusIdx: index('idx_schedule_status').on(table.itemStatus),
    typeSequenceIdx: uniqueIndex('idx_schedule_type_seq').on(
      table.paymentPlanId,
      table.itemType,
      table.sequenceNumber,
    ),
    positiveAmount: check('payment_schedule_amount_positive', sql`${table.amount} > 0`),
    validSequence: check(
      'payment_schedule_valid_sequence',
      sql`(${table.itemType} = 'PREPAYMENT' AND ${table.sequenceNumber} = 0) OR (${table.itemType} = 'INSTALLMENT' AND ${table.sequenceNumber} BETWEEN 1 AND 12)`,
    ),
    noPartialPayment: check(
      'payment_schedule_no_partial_payment',
      sql`${table.paidAmount} = 0 OR ${table.paidAmount} = ${table.amount}`,
    ),
  }),
);

export const paymentTransactions = pgTable(
  'payment_transactions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    paymentPlanId: uuid('payment_plan_id')
      .notNull()
      .references(() => paymentPlans.id),
    paymentScheduleItemId: uuid('payment_schedule_item_id')
      .notNull()
      .references(() => paymentScheduleItems.id),
    userId: uuid('user_id').references(() => users.id),
    amount: integer('amount').notNull(),
    paymentMethod: varchar('payment_method', { length: 30 }).notNull(),
    gatewayName: varchar('gateway_name', { length: 50 }),
    gatewayAuthority: varchar('gateway_authority', { length: 255 }),
    gatewayTransactionId: varchar('gateway_transaction_id', { length: 255 }),
    idempotencyKey: varchar('idempotency_key', { length: 255 }),
    idempotencyFingerprint: varchar('idempotency_fingerprint', { length: 64 }),
    transactionStatus: varchar('transaction_status', { length: 30 }).notNull().default('CREATED'),
    requestedAt: timestamp('requested_at', { withTimezone: true }).defaultNow().notNull(),
    verifiedAt: timestamp('verified_at', { withTimezone: true }),
    failureCode: varchar('failure_code', { length: 50 }),
    failureMessage: varchar('failure_message', { length: 500 }),
    recordedByAdminId: uuid('recorded_by_admin_id').references(() => adminUsers.id),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    scheduleItemIdx: index('idx_transactions_schedule_item').on(table.paymentScheduleItemId),
    statusIdx: index('idx_transactions_status').on(table.transactionStatus),
    idempotencyIdx: uniqueIndex('idx_transactions_user_operation_idempotency').on(
      table.userId,
      table.paymentMethod,
      table.idempotencyKey,
    ),
    gatewayTransactionIdx: uniqueIndex('idx_transactions_gateway_transaction').on(
      table.gatewayTransactionId,
    ),
    oneSuccessfulPaymentIdx: uniqueIndex('idx_transactions_one_success_per_schedule_item')
      .on(table.paymentScheduleItemId)
      .where(sql`${table.transactionStatus} = 'SUCCEEDED'`),
    onePendingOfflinePaymentIdx: uniqueIndex('idx_transactions_one_pending_offline_per_item')
      .on(table.paymentScheduleItemId)
      .where(
        sql`${table.paymentMethod} = 'MANUAL_ADMIN_ENTRY' AND ${table.transactionStatus} = 'CREATED'`,
      ),
    positiveAmount: check('payment_transactions_amount_positive', sql`${table.amount} > 0`),
  }),
);
