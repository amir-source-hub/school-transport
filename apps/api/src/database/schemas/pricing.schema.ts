import {
  pgTable,
  uuid,
  varchar,
  integer,
  timestamp,
  boolean,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { serviceRegistrations } from './registrations.schema';
import { adminUsers } from './auth.schema';

export const registrationPrices = pgTable(
  'registration_prices',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    registrationId: uuid('registration_id')
      .notNull()
      .references(() => serviceRegistrations.id),
    versionNumber: integer('version_number').notNull().default(1),
    totalAmount: integer('total_amount').notNull(),
    currency: varchar('currency', { length: 10 }).notNull().default('IRR'),
    fullPaymentAllowed: boolean('full_payment_allowed').notNull().default(true),
    installmentPaymentAllowed: boolean('installment_payment_allowed').notNull().default(true),
    prepaymentAmount: integer('prepayment_amount').notNull().default(0),
    installmentCount: integer('installment_count').notNull().default(4),
    priceStatus: varchar('price_status', { length: 20 }).notNull().default('DRAFT'),
    setByAdminId: uuid('set_by_admin_id')
      .notNull()
      .references(() => adminUsers.id),
    setAt: timestamp('set_at', { withTimezone: true }).defaultNow().notNull(),
    parentConfirmedAt: timestamp('parent_confirmed_at', { withTimezone: true }),
    replacedByPriceId: uuid('replaced_by_price_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    registrationIdx: index('idx_prices_registration').on(table.registrationId),
    versionIdx: uniqueIndex('idx_prices_version').on(table.registrationId, table.versionNumber),
  }),
);
