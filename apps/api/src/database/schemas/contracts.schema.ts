import { pgTable, uuid, varchar, integer, timestamp, text, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { serviceRegistrations } from './registrations.schema';
import { registrationPrices } from './pricing.schema';
import { paymentPlans } from './payments.schema';
import { adminUsers } from './auth.schema';

export const contracts = pgTable('contracts', {
  id: uuid('id').defaultRandom().primaryKey(),
  registrationId: uuid('registration_id').notNull().references(() => serviceRegistrations.id),
  registrationPriceId: uuid('registration_price_id').notNull().references(() => registrationPrices.id),
  paymentPlanId: uuid('payment_plan_id').references(() => paymentPlans.id),
  contractNumber: varchar('contract_number', { length: 50 }).notNull().unique(),
  contractStatus: varchar('contract_status', { length: 30 }).notNull().default('DRAFT'),
  selectedAddressId: uuid('selected_address_id'),
  contractDataSnapshot: text('contract_data_snapshot'),
  fileStorageKey: varchar('file_storage_key', { length: 255 }),
  versionNumber: integer('version_number').notNull().default(1),
  replacedByContractId: uuid('replaced_by_contract_id'),
  generatedByAdminId: uuid('generated_by_admin_id').references(() => adminUsers.id),
  generatedAt: timestamp('generated_at', { withTimezone: true }),
  acceptedAt: timestamp('accepted_at', { withTimezone: true }),
  cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  registrationIdx: index('idx_contracts_registration').on(table.registrationId),
  contractNumberIdx: uniqueIndex('idx_contracts_number').on(table.contractNumber),
  regVersionIdx: uniqueIndex('idx_contracts_reg_version').on(table.registrationId, table.versionNumber),
}));
