import {
  boolean,
  check,
  date,
  index,
  integer,
  pgTable,
  text,
  time,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { schools } from './schools.schema';
import { students } from './students.schema';

export const drivers = pgTable('drivers', {
  id: uuid('id').defaultRandom().primaryKey(),
  firstName: varchar('first_name', { length: 100 }).notNull(),
  lastName: varchar('last_name', { length: 100 }).notNull(),
  fatherName: varchar('father_name', { length: 100 }),
  nationalId: varchar('national_id', { length: 10 }).notNull().unique(),
  phoneNumber: varchar('phone_number', { length: 20 }).notNull(),
  gender: varchar('gender', { length: 10 }),
  education: varchar('education', { length: 100 }),
  licenseExpiresAt: date('license_expires_at'),
  status: varchar('status', { length: 20 }).notNull().default('ACTIVE'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const vehicles = pgTable(
  'vehicles',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    driverId: uuid('driver_id').notNull().references(() => drivers.id),
    vehicleType: varchar('vehicle_type', { length: 50 }).notNull(),
    system: varchar('system', { length: 100 }).notNull(),
    modelYear: integer('model_year').notNull(),
    plateNumber: varchar('plate_number', { length: 30 }).notNull(),
    capacity: integer('capacity').notNull(),
    status: varchar('status', { length: 20 }).notNull().default('ACTIVE'),
    technicalInspectionExpiresAt: date('technical_inspection_expires_at'),
    insuranceExpiresAt: date('insurance_expires_at'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    driverIdx: index('idx_vehicles_driver').on(table.driverId),
    plateUnique: uniqueIndex('idx_vehicles_plate_unique').on(table.plateNumber),
    positiveCapacity: check('vehicles_capacity_positive', sql`${table.capacity} > 0`),
  }),
);

/** One row is one actual service run, not a geographic route shared by many loads. */
export const transportServiceRuns = pgTable(
  'transport_service_runs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    schoolId: uuid('school_id').notNull().references(() => schools.id),
    driverId: uuid('driver_id').notNull().references(() => drivers.id),
    vehicleId: uuid('vehicle_id').notNull().references(() => vehicles.id),
    academicYear: varchar('academic_year', { length: 20 }).notNull(),
    title: varchar('title', { length: 100 }).notNull(),
    direction: varchar('direction', { length: 12 }).notNull(),
    sequenceNumber: integer('sequence_number').notNull(),
    scheduledStartTime: time('scheduled_start_time').notNull(),
    scheduledArrivalTime: time('scheduled_arrival_time').notNull(),
    areaDescription: text('area_description'),
    activeWeekdays: integer('active_weekdays').array().notNull().default([]),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    schoolIdx: index('idx_transport_runs_school').on(table.schoolId),
    driverIdx: index('idx_transport_runs_driver').on(table.driverId),
    vehicleIdx: index('idx_transport_runs_vehicle').on(table.vehicleId),
    scheduleUnique: uniqueIndex('idx_transport_runs_schedule_unique').on(
      table.vehicleId,
      table.academicYear,
      table.direction,
      table.sequenceNumber,
    ),
    validDirection: check(
      'transport_runs_direction_check',
      sql`${table.direction} in ('TO_SCHOOL', 'FROM_SCHOOL')`,
    ),
    positiveSequence: check(
      'transport_runs_sequence_positive',
      sql`${table.sequenceNumber} > 0`,
    ),
  }),
);

export const transportServiceRunStudents = pgTable(
  'transport_service_run_students',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    serviceRunId: uuid('service_run_id').notNull().references(() => transportServiceRuns.id),
    studentId: uuid('student_id').notNull().references(() => students.id),
    pickupOrder: integer('pickup_order').notNull(),
    notes: text('notes'),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    runStudentUnique: uniqueIndex('idx_transport_run_student_unique').on(
      table.serviceRunId,
      table.studentId,
    ),
    runPickupOrderUnique: uniqueIndex('idx_transport_run_pickup_order_unique').on(
      table.serviceRunId,
      table.pickupOrder,
    ),
    studentIdx: index('idx_transport_run_students_student').on(table.studentId),
    positivePickupOrder: check(
      'transport_run_students_pickup_order_positive',
      sql`${table.pickupOrder} > 0`,
    ),
  }),
);

export const transportDocuments = pgTable(
  'transport_documents',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    driverId: uuid('driver_id').references(() => drivers.id),
    vehicleId: uuid('vehicle_id').references(() => vehicles.id),
    documentType: varchar('document_type', { length: 50 }).notNull(),
    pageNumber: integer('page_number').notNull().default(1),
    objectKey: varchar('object_key', { length: 500 }).notNull(),
    mimeType: varchar('mime_type', { length: 100 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    driverIdx: index('idx_transport_documents_driver').on(table.driverId),
    vehicleIdx: index('idx_transport_documents_vehicle').on(table.vehicleId),
    exactlyOneOwner: check(
      'transport_document_owner_check',
      sql`(${table.driverId} is not null) <> (${table.vehicleId} is not null)`,
    ),
    positivePageNumber: check(
      'transport_documents_page_number_positive',
      sql`${table.pageNumber} > 0`,
    ),
  }),
);
