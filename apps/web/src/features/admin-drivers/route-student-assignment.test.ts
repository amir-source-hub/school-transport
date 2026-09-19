import { describe, expect, it } from 'vitest';
import type { AdminTransportRoute } from './admin-drivers-api';
import { studentRouteAssignments } from './route-student-assignment';

const route = (direction: AdminTransportRoute['direction'], academicYear: string, ids: string[]) =>
  ({ direction, academicYear, students: ids.map((id) => ({ id })) }) as AdminTransportRoute;

describe('student route assignment badges', () => {
  it('marks outbound green, inbound yellow, both with both badges, and unassigned with none', () => {
    const assignments = studentRouteAssignments(
      [
        route('TO_SCHOOL', '1405-1406', ['outbound', 'both']),
        route('FROM_SCHOOL', '1405-1406', ['inbound', 'both']),
        route('ROUND_TRIP', '1405-1406', ['round-trip']),
      ],
      '1405-1406',
    );
    expect(assignments.get('outbound')).toBe('TO_SCHOOL');
    expect(assignments.get('inbound')).toBe('FROM_SCHOOL');
    expect(assignments.get('both')).toBe('BOTH');
    expect(assignments.get('round-trip')).toBe('BOTH');
    expect(assignments.has('unassigned')).toBe(false);
  });

  it('does not color an assignment from another academic year', () => {
    const assignments = studentRouteAssignments(
      [route('TO_SCHOOL', '1404-1405', ['old'])],
      '1405-1406',
    );
    expect(assignments.has('old')).toBe(false);
  });
});
