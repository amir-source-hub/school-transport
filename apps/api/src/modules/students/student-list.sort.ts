import { asc, desc, eq, sql, type SQL } from 'drizzle-orm';
import { schools, students } from '../../database/schemas';
import type {
  AdminListSortDirection,
  AdminStudentArchiveFilter,
  AdminStudentSortKey,
} from './student-list.dto';

// Map Persian letters to ASCII keys in alphabetic order before database pagination.
// Normalize common Arabic variants so ک/ك and ی/ي sort together.
function persianNameKey(column: SQL): SQL {
  return sql`translate(replace(replace(trim(${column}), 'ك', 'ک'), 'ي', 'ی'), 'ابپتثجچحخدذرزژسشصضطظعغفقکگلمنوهی', '0123456789ABCDEFGHIJKLMNOPQRSTUV') collate "C"`;
}
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
      return [dir(persianNameKey(sql`${students.lastName}`)), dir(persianNameKey(sql`${students.firstName}`)), dir(students.id)];
    case 'schoolName':
      return [dir(persianNameKey(sql`${schools.name}`)), dir(persianNameKey(sql`${students.lastName}`)), dir(persianNameKey(sql`${students.firstName}`)), dir(students.id)];
    case 'createdAt':
    default:
      return [dir(students.createdAt), dir(students.id)];
  }
}
