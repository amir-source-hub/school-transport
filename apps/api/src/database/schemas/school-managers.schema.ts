import {
  boolean,
  index,
  integer,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { schools } from './schools.schema';

export const schoolManagerUsers = pgTable('school_manager_users', {
  id: uuid('id').defaultRandom().primaryKey(),
  username: varchar('username', { length: 100 }).notNull().unique(),
  firstName: varchar('first_name', { length: 100 }).notNull(),
  lastName: varchar('last_name', { length: 100 }).notNull(),
  phoneNumber: varchar('phone_number', { length: 20 }).notNull().unique(),
  email: varchar('email', { length: 255 }),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  status: varchar('status', { length: 20 }).notNull().default('ACTIVE'),
  mustChangeCredentials: boolean('must_change_credentials').notNull().default(true),
  credentialsChangedAt: timestamp('credentials_changed_at', { withTimezone: true }),
  failedLoginCount: integer('failed_login_count').notNull().default(0),
  lockedUntil: timestamp('locked_until', { withTimezone: true }),
  lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const schoolManagerAssignments = pgTable(
  'school_manager_assignments',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    managerUserId: uuid('manager_user_id')
      .notNull()
      .references(() => schoolManagerUsers.id),
    schoolId: uuid('school_id')
      .notNull()
      .references(() => schools.id),
    isPrimary: boolean('is_primary').notNull().default(false),
    status: varchar('status', { length: 20 }).notNull().default('ACTIVE'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    managerSchoolUnique: uniqueIndex('idx_school_manager_assignment_unique').on(
      table.managerUserId,
      table.schoolId,
    ),
    managerStatusIdx: index('idx_school_manager_assignment_manager').on(
      table.managerUserId,
      table.status,
    ),
    schoolStatusIdx: index('idx_school_manager_assignment_school').on(
      table.schoolId,
      table.status,
    ),
  }),
);
