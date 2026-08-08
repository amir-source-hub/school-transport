import { pgTable, uuid, varchar, boolean, timestamp, jsonb } from 'drizzle-orm/pg-core';

export type SchoolEducationOption = {
  level: string;
  grades: string[];
};

export const schools = pgTable('schools', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 200 }).notNull(),
  schoolType: varchar('school_type', { length: 20 }).notNull().default('PUBLIC'),
  genderType: varchar('gender_type', { length: 10 }).notNull().default('MIXED'),
  province: varchar('province', { length: 100 }).notNull(),
  city: varchar('city', { length: 100 }).notNull(),
  district: varchar('district', { length: 100 }),
  address: varchar('address', { length: 500 }).notNull(),
  phoneNumber: varchar('phone_number', { length: 20 }),
  managerName: varchar('manager_name', { length: 100 }),
  managerPhone: varchar('manager_phone', { length: 20 }),
  educationOptions: jsonb('education_options')
    .$type<SchoolEducationOption[]>()
    .notNull()
    .default([]),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
