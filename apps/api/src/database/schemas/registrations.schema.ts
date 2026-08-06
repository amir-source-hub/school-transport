import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  integer,
  text,
  boolean,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { students } from './students.schema';
import { adminUsers } from './auth.schema';

export const serviceRegistrations = pgTable(
  'service_registrations',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    studentId: uuid('student_id')
      .notNull()
      .references(() => students.id),
    academicYear: varchar('academic_year', { length: 20 }).notNull(),
    serviceType: varchar('service_type', { length: 20 }).notNull(),
    selectedAddressId: uuid('selected_address_id'),
    requestedStartDate: timestamp('requested_start_date', { withTimezone: true }),
    registrationStatus: varchar('registration_status', { length: 30 }).notNull().default('DRAFT'),
    submissionNumber: integer('submission_number').notNull().default(1),
    previousRegistrationId: uuid('previous_registration_id'),
    submittedAt: timestamp('submitted_at', { withTimezone: true }),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
    reviewedByAdminId: uuid('reviewed_by_admin_id').references(() => adminUsers.id),
    rejectionReason: text('rejection_reason'),
    parentNotes: text('parent_notes'),
    adminNotes: text('admin_notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    studentIdx: index('idx_registrations_student').on(table.studentId),
    statusIdx: index('idx_registrations_status').on(table.registrationStatus),
    academicYearIdx: index('idx_registrations_academic_year').on(table.academicYear),
    oneActiveEnrollmentIdx: uniqueIndex('idx_registrations_one_active_student_year')
      .on(table.studentId, table.academicYear)
      .where(sql`${table.registrationStatus} NOT IN ('REJECTED', 'CANCELLED')`),
  }),
);

export const registrationSnapshots = pgTable('registration_snapshots', {
  id: uuid('id').defaultRandom().primaryKey(),
  registrationId: uuid('registration_id')
    .notNull()
    .references(() => serviceRegistrations.id),
  snapshotType: varchar('snapshot_type', { length: 20 }).notNull(),
  studentData: text('student_data'),
  parentData: text('parent_data'),
  selectedAddressData: text('selected_address_data'),
  emergencyContactData: text('emergency_contact_data'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const registrationReviews = pgTable(
  'registration_reviews',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    registrationId: uuid('registration_id')
      .notNull()
      .references(() => serviceRegistrations.id),
    adminId: uuid('admin_id')
      .notNull()
      .references(() => adminUsers.id),
    reviewAction: varchar('review_action', { length: 30 }).notNull(),
    comment: text('comment'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    registrationReviewIdx: index('idx_reviews_registration').on(table.registrationId),
  }),
);

export const registrationNotes = pgTable('registration_notes', {
  id: uuid('id').defaultRandom().primaryKey(),
  registrationId: uuid('registration_id')
    .notNull()
    .references(() => serviceRegistrations.id),
  adminId: uuid('admin_id')
    .notNull()
    .references(() => adminUsers.id),
  noteType: varchar('note_type', { length: 30 }).notNull(),
  content: text('content').notNull(),
  isVisibleToParent: boolean('is_visible_to_parent').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
