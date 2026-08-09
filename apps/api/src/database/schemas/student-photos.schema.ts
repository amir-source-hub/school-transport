import {
  pgTable,
  uuid,
  varchar,
  integer,
  text,
  timestamp,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { users } from './auth.schema';
import { adminUsers } from './auth.schema';
import { students } from './students.schema';

export const studentPhotoUploads = pgTable(
  'student_photo_uploads',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    accountUserId: uuid('account_user_id')
      .notNull()
      .references(() => users.id),
    studentId: uuid('student_id').references(() => students.id),
    version: integer('version').notNull().default(1),
    rawKey: varchar('raw_key', { length: 255 }).notNull(),
    canonicalKey: varchar('canonical_key', { length: 255 }),
    declaredMime: varchar('declared_mime', { length: 60 }).notNull(),
    declaredSize: integer('declared_size').notNull(),
    actualMime: varchar('actual_mime', { length: 60 }),
    actualSize: integer('actual_size'),
    width: integer('width'),
    height: integer('height'),
    checksum: varchar('checksum', { length: 64 }),
    status: varchar('status', { length: 30 }).notNull().default('AUTHORIZED'),
    rejectionCode: varchar('rejection_code', { length: 60 }),
    rejectionDetail: text('rejection_detail'),
    reviewerAdminId: uuid('reviewer_admin_id').references(() => adminUsers.id),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
    uploadAuthorizationExpiry: timestamp('upload_authorization_expiry', {
      withTimezone: true,
    }).notNull(),
    authorizedAt: timestamp('authorized_at', { withTimezone: true }).defaultNow().notNull(),
    uploadedAt: timestamp('uploaded_at', { withTimezone: true }),
    validatingAt: timestamp('validating_at', { withTimezone: true }),
    pendingReviewAt: timestamp('pending_review_at', { withTimezone: true }),
    approvedAt: timestamp('approved_at', { withTimezone: true }),
    rejectedAt: timestamp('rejected_at', { withTimezone: true }),
    supersededAt: timestamp('superseded_at', { withTimezone: true }),
    failedAt: timestamp('failed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    oneApprovedPerStudent: uniqueIndex('idx_student_photos_one_approved')
      .on(table.studentId)
      .where(sql`${table.status} = 'APPROVED'`),
    accountIdx: index('idx_student_photos_account').on(table.accountUserId, table.createdAt),
    studentIdx: index('idx_student_photos_student').on(table.studentId, table.status),
    reviewQueueIdx: index('idx_student_photos_review_queue').on(table.status, table.createdAt),
    cleanupIdx: index('idx_student_photos_cleanup').on(table.status, table.updatedAt),
  }),
);

export type StudentPhotoUploadRow = typeof studentPhotoUploads.$inferSelect;
