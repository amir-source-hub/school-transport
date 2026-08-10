import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';

export const ADMIN_STUDENT_ARCHIVE_FILTERS = ['all', 'active', 'archived'] as const;
export const ADMIN_STUDENT_SORT_KEYS = ['studentName', 'schoolName', 'createdAt'] as const;
export const ADMIN_LIST_SORT_DIRECTIONS = ['asc', 'desc'] as const;
export type AdminStudentArchiveFilter = (typeof ADMIN_STUDENT_ARCHIVE_FILTERS)[number];
export type AdminStudentSortKey = (typeof ADMIN_STUDENT_SORT_KEYS)[number];
export type AdminListSortDirection = (typeof ADMIN_LIST_SORT_DIRECTIONS)[number];

export class AdminStudentListQueryDto {
  @IsOptional()
  @IsIn(ADMIN_STUDENT_ARCHIVE_FILTERS)
  archive: AdminStudentArchiveFilter = 'all';

  @IsOptional()
  @IsIn(ADMIN_STUDENT_SORT_KEYS)
  sort: AdminStudentSortKey = 'createdAt';

  @IsOptional()
  @IsIn(ADMIN_LIST_SORT_DIRECTIONS)
  direction: AdminListSortDirection = 'desc';

  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize = 20;
}
