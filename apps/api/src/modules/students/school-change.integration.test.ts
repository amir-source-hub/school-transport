import { expect, it, vi } from 'vitest';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { and, eq, ne } from 'drizzle-orm';
import {
  schools,
  students,
  transportServiceRuns,
  transportServiceRunStudents,
} from '../../database/schemas';
import { StudentsService } from './students.service';
import { DriverEnrollmentService } from '../driver-enrollment/driver-enrollment.service';

// Explicit opt-in: reuse local fixtures inside a transaction that always rolls back.
it.skipIf(process.env.TEST_LOCAL_SCHOOL_CHANGE !== '1')(
  'changes school with real PostgreSQL timestamps and detaches old routes',
  async () => {
    const url = new URL(process.env.DATABASE_URL!);
    expect(['localhost', '127.0.0.1']).toContain(url.hostname);
    const pool = new Pool({ connectionString: url.toString(), max: 1 });
    const rollback = new Error('rollback verification');
    let verified = false;
    try {
      await expect(
        drizzle(pool).transaction(async (txn) => {
          const [pupil] = await txn
            .select()
            .from(students)
            .where(eq(students.isActive, true))
            .limit(1);
          expect(pupil).toBeDefined();
          const candidates = await txn
            .select()
            .from(schools)
            .where(and(eq(schools.isActive, true), ne(schools.id, pupil.schoolId)));
          const school = candidates.find((s) => s.educationOptions.some((p) => p.grades.length));
          expect(school).toBeDefined();
          const program = school!.educationOptions.find((p) => p.grades.length)!;
          const service = new StudentsService(
            { db: txn } as never,
            { enqueueInTransaction: vi.fn() } as never,
            { recordInTransaction: vi.fn() } as never,
          );
          const result = await service.updateByAdmin(pupil.id, {
            schoolId: school!.id,
            educationLevel: program.level,
            grade: program.grades[0],
            expectedUpdatedAt: pupil.updatedAt.toISOString(),
          });
          expect(result.id).toBe(pupil.id);
          const [saved] = await txn.select().from(students).where(eq(students.id, pupil.id));
          expect(saved.schoolId).toBe(school!.id);
          const memberships = await txn
            .select()
            .from(transportServiceRunStudents)
            .where(
              and(
                eq(transportServiceRunStudents.studentId, pupil.id),
                eq(transportServiceRunStudents.isActive, true),
              ),
            );
          expect(memberships).toHaveLength(0);
          verified = true;
          throw rollback;
        }),
      ).rejects.toBe(rollback);
      expect(verified).toBe(true);
    } finally {
      await pool.end();
    }
  },
);

it.skipIf(process.env.TEST_LOCAL_SCHOOL_CHANGE !== '1')(
  'persists both route directions atomically in PostgreSQL',
  async () => {
    const url = new URL(process.env.DATABASE_URL!);
    expect(['localhost', '127.0.0.1']).toContain(url.hostname);
    const pool = new Pool({ connectionString: url.toString(), max: 1 });
    const rollback = new Error('rollback route verification');
    let verified = false;
    try {
      await expect(
        drizzle(pool).transaction(async (txn) => {
          const routes = await txn
            .select()
            .from(transportServiceRuns)
            .where(eq(transportServiceRuns.isActive, true));
          const to = routes.find(
            (r) =>
              r.direction === 'TO_SCHOOL' &&
              routes.some(
                (b) =>
                  b.direction === 'FROM_SCHOOL' &&
                  b.driverId === r.driverId &&
                  b.schoolId === r.schoolId &&
                  b.academicYear === r.academicYear,
              ),
          );
          expect(to).toBeDefined();
          const from = routes.find(
            (r) =>
              r.direction === 'FROM_SCHOOL' &&
              r.driverId === to!.driverId &&
              r.schoolId === to!.schoolId &&
              r.academicYear === to!.academicYear,
          )!;
          const [pupil] = await txn
            .select()
            .from(students)
            .where(and(eq(students.schoolId, to!.schoolId), eq(students.isActive, true)))
            .limit(1);
          expect(pupil).toBeDefined();
          const service = new DriverEnrollmentService(
            { db: txn } as never,
            {} as never,
            { recordInTransaction: vi.fn() } as never,
            { enqueueInTransaction: vi.fn() } as never,
          );
          await service.assignStudentRoutes(
            {
              studentId: pupil.id,
              toSchoolRouteId: to!.id,
              fromSchoolRouteId: from.id,
              toSchoolStopTime: to!.scheduledStartTime.slice(0, 5),
              fromSchoolStopTime: from.scheduledArrivalTime.slice(0, 5),
            },
            pupil.userId,
          );
          const assigned = await txn
            .select()
            .from(transportServiceRunStudents)
            .where(
              and(
                eq(transportServiceRunStudents.studentId, pupil.id),
                eq(transportServiceRunStudents.isActive, true),
              ),
            );
          expect(assigned.map((m) => m.serviceRunId)).toEqual(
            expect.arrayContaining([to!.id, from.id]),
          );
          verified = true;
          throw rollback;
        }),
      ).rejects.toBe(rollback);
      expect(verified).toBe(true);
    } finally {
      await pool.end();
    }
  },
);
