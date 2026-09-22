import type { AdminTransportRoute } from './admin-drivers-api';

export type StudentRouteAssignment = 'TO_SCHOOL' | 'FROM_SCHOOL' | 'BOTH';

export function studentRouteAssignmentConflict(
  assignment: StudentRouteAssignment | undefined,
  direction: AdminTransportRoute['direction'] | undefined,
): string | undefined {
  if (!assignment || !direction) return undefined;
  if (direction === 'ROUND_TRIP')
    return 'دانش‌آموز قبلاً مسیر رفت یا برگشت دارد و نمی‌تواند به مسیر رفت‌وبرگشت افزوده شود.';
  if (assignment === 'BOTH')
    return 'دانش‌آموز قبلاً هر دو جهت یا یک مسیر رفت‌وبرگشت دارد.';
  if (assignment === direction)
    return direction === 'TO_SCHOOL'
      ? 'دانش‌آموز قبلاً به یک مسیر رفت افزوده شده است.'
      : 'دانش‌آموز قبلاً به یک مسیر برگشت افزوده شده است.';
  return undefined;
}

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
