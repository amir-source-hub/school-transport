import { asc, desc, eq, type SQL } from 'drizzle-orm';
import { schools, students } from '../../database/schemas';
import type {
  AdminListSortDirection,
  AdminStudentArchiveFilter,
  AdminStudentSortKey,
} from './student-list.dto';

/**
 * Persian collation decision: names are ordered by PostgreSQL using the
 * database collation over the raw first_name/last_name values. Sorting is
 * not delegated to JavaScript to avoid assuming its built-in A→Z order is
 * correct for Persian names; the DB collation/byte ordering is the single
 * ordering source for admin student lists.
 */
export function buildAdminStudentArchiveWhere(archive: AdminStudentArchiveFilter): SQL | undefined {
  if (archive === 'all') return undefined;
  return eq(students.isActive, archive === 'active');
}

export function buildAdminStudentOrderBy(
  sort: AdminStudentSortKey,
  direction: AdminListSortDirection,
): SQL[] {
  const dir = direction === 'asc' ? asc : desc;
  switch (sort) {
    case 'studentName':
      return [dir(students.lastName), dir(students.firstName)];
    case 'schoolName':
      return [dir(schools.name), dir(students.lastName), dir(students.firstName)];
    case 'createdAt':
    default:
      return [dir(students.createdAt)];
  }
}
