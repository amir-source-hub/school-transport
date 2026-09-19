import type { AdminTransportRoute } from './admin-drivers-api';

export type StudentRouteAssignment = 'TO_SCHOOL' | 'FROM_SCHOOL' | 'BOTH';

export function studentRouteAssignments(
  routes: AdminTransportRoute[],
  academicYear?: string,
): Map<string, StudentRouteAssignment> {
  const assignments = new Map<string, StudentRouteAssignment>();
  for (const route of routes) {
    if (academicYear && route.academicYear !== academicYear) continue;
    for (const student of route.students) {
      const previous = assignments.get(student.id);
      const direction = route.direction;
      if (direction === 'ROUND_TRIP' || previous === 'BOTH') {
        assignments.set(student.id, 'BOTH');
      } else if (previous && previous !== direction) {
        assignments.set(student.id, 'BOTH');
      } else {
        assignments.set(student.id, direction);
      }
    }
  }
  return assignments;
}
