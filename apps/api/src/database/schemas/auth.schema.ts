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

export const users = pgTable(
  'users',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    username: varchar('username', { length: 100 }).notNull().unique(),
    phoneNumber: varchar('phone_number', { length: 20 }).unique(),
    accountStatus: varchar('account_status', { length: 20 }).notNull().default('ACTIVE'),
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
  isSuperAdmin: boolean('is_super_admin').notNull().default(false),
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
    subjectId: uuid('subject_id').notNull(),
    role: varchar('role', { length: 20 }).notNull(),
    refreshTokenHash: varchar('refresh_token_hash', { length: 64 }).notNull(),
    deviceName: varchar('device_name', { length: 255 }),
    ipAddress: varchar('ip_address', { length: 64 }),
    userAgent: varchar('user_agent', { length: 500 }),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    revocationReason: varchar('revocation_reason', { length: 100 }),
    replacedBySessionId: uuid('replaced_by_session_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    tokenHashIdx: uniqueIndex('idx_auth_sessions_token_hash').on(table.refreshTokenHash),
    subjectRoleIdx: index('idx_auth_sessions_subject_role').on(table.subjectId, table.role),
    expiresAtIdx: index('idx_auth_sessions_expires_at').on(table.expiresAt),
    revokedAtIdx: index('idx_auth_sessions_revoked_at').on(table.revokedAt),
  }),
);
