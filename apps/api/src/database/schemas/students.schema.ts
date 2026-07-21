import { pgTable, uuid, varchar, timestamp, boolean, date, index } from 'drizzle-orm/pg-core';
import { users } from './auth.schema';
import { schools } from './schools.schema';

export const students = pgTable(
  'students',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    schoolId: uuid('school_id')
      .notNull()
      .references(() => schools.id),
    firstName: varchar('first_name', { length: 100 }).notNull(),
    lastName: varchar('last_name', { length: 100 }).notNull(),
    nationalId: varchar('national_id', { length: 20 }).notNull().unique(),
    birthDate: date('birth_date'),
    gender: varchar('gender', { length: 10 }),
    grade: varchar('grade', { length: 50 }),
    className: varchar('class_name', { length: 50 }),
    studentCode: varchar('student_code', { length: 50 }),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    userIdx: index('idx_students_user').on(table.userId),
    schoolIdx: index('idx_students_school').on(table.schoolId),
    nationalIdIdx: index('idx_students_national_id').on(table.nationalId),
  }),
);
