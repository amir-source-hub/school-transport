import { pgTable, uuid, varchar, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';
import { students } from './students.schema';

export const studentCompanions = pgTable('student_companions', {
  id: uuid('id').defaultRandom().primaryKey(),
  studentId: uuid('student_id').notNull().references(() => students.id, { onDelete: 'cascade' }),
  firstName: varchar('first_name', { length: 100 }).notNull(),
  lastName: varchar('last_name', { length: 100 }).notNull(),
  fatherName: varchar('father_name', { length: 100 }).notNull(),
  nationalId: varchar('national_id', { length: 10 }).notNull().unique(),
  phoneNumber: varchar('phone_number', { length: 11 }).notNull(),
  relationship: varchar('relationship', { length: 20 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, table => ({ studentUnique: uniqueIndex('student_companions_student_unique').on(table.studentId) }));
