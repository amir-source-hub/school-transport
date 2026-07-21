import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  boolean,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { users } from './auth.schema';
import { sql } from 'drizzle-orm';

export const parents = pgTable(
  'parents',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    parentType: varchar('parent_type', { length: 10 }).notNull(),
    firstName: varchar('first_name', { length: 100 }).notNull(),
    lastName: varchar('last_name', { length: 100 }).notNull(),
    nationalId: varchar('national_id', { length: 20 }).notNull().unique(),
    phoneNumber: varchar('phone_number', { length: 20 }).notNull(),
    isPrimaryContact: boolean('is_primary_contact').notNull().default(false),
    phoneVerifiedAt: timestamp('phone_verified_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    userParentTypeIdx: uniqueIndex('idx_parents_user_type').on(table.userId, table.parentType),
    onePrimaryPerUser: uniqueIndex('idx_parents_one_primary')
      .on(table.userId)
      .where(sql`${table.isPrimaryContact} = true`),
    phoneIdx: index('idx_parents_phone').on(table.phoneNumber),
    nationalIdIdx: index('idx_parents_national_id').on(table.nationalId),
  }),
);

export const familyAddresses = pgTable(
  'family_addresses',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    title: varchar('title', { length: 50 }).notNull(),
    province: varchar('province', { length: 100 }).notNull(),
    city: varchar('city', { length: 100 }).notNull(),
    district: varchar('district', { length: 100 }),
    streetAddress: varchar('street_address', { length: 500 }).notNull(),
    postalCode: varchar('postal_code', { length: 20 }),
    additionalDetails: varchar('additional_details', { length: 500 }),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    userAddressIdx: index('idx_addresses_user').on(table.userId),
  }),
);

export const emergencyContacts = pgTable(
  'emergency_contacts',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    firstName: varchar('first_name', { length: 100 }).notNull(),
    lastName: varchar('last_name', { length: 100 }).notNull(),
    relationship: varchar('relationship', { length: 50 }).notNull(),
    phoneNumber: varchar('phone_number', { length: 20 }).notNull(),
    secondaryPhoneNumber: varchar('secondary_phone_number', { length: 20 }),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    userEmergencyIdx: index('idx_emergency_user').on(table.userId),
  }),
);
