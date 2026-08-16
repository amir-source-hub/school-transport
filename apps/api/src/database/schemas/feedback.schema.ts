import { index, integer, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { adminUsers, users } from './auth.schema';
import { schoolManagerUsers } from './school-managers.schema';
import { schools } from './schools.schema';
import { students } from './students.schema';

export const feedbackSubmissions = pgTable(
  'feedback_submissions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    senderType: varchar('sender_type', { length: 20 }).notNull().default('PARENT'),
    contactName: varchar('contact_name', { length: 120 }),
    userId: uuid('user_id').references(() => users.id),
    managerUserId: uuid('manager_user_id').references(() => schoolManagerUsers.id),
    schoolId: uuid('school_id').references(() => schools.id),
    studentId: uuid('student_id').references(() => students.id),
    category: varchar('category', { length: 30 }).notNull(),
    subject: varchar('subject', { length: 120 }).notNull(),
    message: text('message').notNull(),
    status: varchar('status', { length: 20 }).notNull().default('NEW'),
    priority: varchar('priority', { length: 20 }).notNull().default('NORMAL'),
    assigneeId: uuid('assignee_id').references(() => adminUsers.id),
    readAt: timestamp('read_at', { withTimezone: true }),
    response: text('response'),
    responderId: uuid('responder_id').references(() => adminUsers.id),
    respondedAt: timestamp('responded_at', { withTimezone: true }),
    closedAt: timestamp('closed_at', { withTimezone: true }),
    version: integer('version').notNull().default(1),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    userIdx: index('idx_feedback_user').on(table.userId, table.createdAt),
    managerSenderIdx: index('idx_feedback_manager_sender').on(
      table.senderType,
      table.managerUserId,
      table.createdAt,
    ),
    schoolIdx: index('idx_feedback_school').on(table.schoolId, table.createdAt),
    queueIdx: index('idx_feedback_queue').on(table.status, table.priority, table.createdAt),
  }),
);
