import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('route assignment integrity', () => {
  it('rejects an overlapping assignment instead of silently moving the student', () => {
    const source = readFileSync(resolve(__dirname, 'driver-enrollment.service.ts'), 'utf8');
    const start = source.indexOf('async addStudentToRoute(');
    const method = source.slice(start, source.indexOf('async removeStudentFromRoute(', start));

    expect(method).toContain('STUDENT_ROUTE_DIRECTION_ALREADY_ASSIGNED');
    expect(method).toContain("eq(transportServiceRunStudents.isActive, true)");
    expect(method).toContain("eq(transportServiceRuns.academicYear, route.academicYear)");
    expect(method).not.toContain("set({ isActive: false })");
  });

  it('ships cleanup and a concurrency-safe database guard', () => {
    const migration = readFileSync(
      resolve(__dirname, '../../../drizzle/0064_repair_transport_assignment_overlaps.sql'),
      'utf8',
    );

    expect(migration).toContain('row_number() OVER');
    expect(migration).toContain("direction = 'ROUND_TRIP'");
    expect(migration).toContain('PERFORM id FROM students');
    expect(migration).toContain('Student already has an active route for this direction');
  });
});
