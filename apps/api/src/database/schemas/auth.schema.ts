import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  integer,
  boolean,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const users = pgTable(
  'users',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    username: varchar('username', { length: 100 }).notNull().unique(),
    phoneNumber: varchar('phone_number', { length: 20 }).unique(),
    accountStatus: varchar('account_status', { length: 20 }).notNull().default('ACTIVE'),
    studentLimit: integer('student_limit').notNull().default(2),
    lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    usernameIdx: index('idx_users_username').on(table.username),
    phoneIdx: uniqueIndex('idx_users_phone').on(table.phoneNumber),
  }),
);

export const adminUsers = pgTable('admin_users', {
  id: uuid('id').defaultRandom().primaryKey(),
  username: varchar('username', { length: 100 }).notNull().unique(),
  firstName: varchar('first_name', { length: 100 }).notNull(),
  lastName: varchar('last_name', { length: 100 }).notNull(),
  email: varchar('email', { length: 255 }),
  phoneNumber: varchar('phone_number', { length: 20 }).notNull().unique(),
  status: varchar('status', { length: 20 }).notNull().default('ACTIVE'),
  passwordHash: varchar('password_hash', { length: 255 }),
  lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const adminAuthChallenges = pgTable(
  'admin_auth_challenges',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    adminId: uuid('admin_id')
      .notNull()
      .references(() => adminUsers.id),
    challengeHash: varchar('challenge_hash', { length: 64 }).notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    attemptCount: integer('attempt_count').notNull().default(0),
    maxAttempts: integer('max_attempts').notNull().default(5),
    usedAt: timestamp('used_at', { withTimezone: true }),
    invalidatedAt: timestamp('invalidated_at', { withTimezone: true }),
    requestIp: varchar('request_ip', { length: 64 }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    adminIdIdx: index('idx_admin_auth_challenges_admin').on(table.adminId),
    expiresAtIdx: index('idx_admin_auth_challenges_expires').on(table.expiresAt),
  }),
);

export const otpRequests = pgTable(
  'otp_requests',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    phoneNumber: varchar('phone_number', { length: 20 }).notNull(),
    purpose: varchar('purpose', { length: 50 }).notNull(),
    codeHash: varchar('code_hash', { length: 255 }).notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    attemptCount: integer('attempt_count').notNull().default(0),
    maxAttempts: integer('max_attempts').notNull().default(5),
    verifiedAt: timestamp('verified_at', { withTimezone: true }),
    invalidatedAt: timestamp('invalidated_at', { withTimezone: true }),
    requestIp: varchar('request_ip', { length: 64 }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    phonePurposeIdx: index('idx_otp_phone_purpose').on(table.phoneNumber, table.purpose),
    requestIpCreatedIdx: index('idx_otp_request_ip_created').on(table.requestIp, table.createdAt),
  }),
);

export const authSessions = pgTable(
  'auth_sessions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    subjectId: uuid('subject_id')
      .notNull()
      .references(() => users.id),
    role: varchar('role', { length: 20 }).notNull(),
    refreshTokenHash: varchar('refresh_token_hash', { length: 64 }).notNull().unique(),
    deviceName: varchar('device_name', { length: 255 }),
    ipAddress: varchar('ip_address', { length: 45 }),
    userAgent: varchar('user_agent', { length: 500 }),
    remembered: boolean('remembered').notNull().default(false),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    revocationReason: varchar('revocation_reason', { length: 30 }),
    replacedBySessionId: uuid('replaced_by_session_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    refreshTokenHashIdx: uniqueIndex('idx_sessions_refresh_token_hash').on(table.refreshTokenHash),
    subjectRoleIdx: index('idx_sessions_subject_role').on(table.subjectId, table.role),
    expiresAtIdx: index('idx_sessions_expires_at').on(table.expiresAt),
    revokedAtIdx: index('idx_sessions_revoked_at').on(table.revokedAt),
  }),
);

export const onboardingSessions = pgTable(
  'onboarding_sessions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    phoneNumber: varchar('phone_number', { length: 20 }).notNull(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    status: varchar('status', { length: 20 }).notNull().default('PENDING'),
    onboardingTokenHash: varchar('onboarding_token_hash', { length: 64 }).notNull(),
    verifiedAt: timestamp('verified_at', { withTimezone: true }).notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    currentStep: varchar('current_step', { length: 50 }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    activePerPhoneIdx: uniqueIndex('idx_onboarding_one_active_per_phone')
      .on(table.phoneNumber)
      .where(sql`${table.status} = 'PENDING'`),
    phoneStatusIdx: index('idx_onboarding_phone_status').on(table.phoneNumber, table.status),
    expiresAtIdx: index('idx_onboarding_expires_at').on(table.expiresAt),
  }),
);
