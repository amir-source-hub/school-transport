import { Transform, Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Length, Max, Min } from 'class-validator';

export const MANAGER_STUDENT_SORT_KEYS = [
  'name',
  'nationalId',
  'studentCode',
  'educationLevel',
  'grade',
  'createdAt',
  'registrationStatus',
] as const;
export const MANAGER_STUDENT_SORT_DIRECTIONS = ['asc', 'desc'] as const;
export const MANAGER_PHOTO_STATUS_FILTERS = ['all', 'with_photo', 'without_photo'] as const;
export type ManagerStudentSortKey = (typeof MANAGER_STUDENT_SORT_KEYS)[number];
export type ManagerSortDirection = (typeof MANAGER_STUDENT_SORT_DIRECTIONS)[number];
export type ManagerPhotoStatusFilter = (typeof MANAGER_PHOTO_STATUS_FILTERS)[number];

const blankToUndefined = ({ value }: { value: unknown }) =>
  typeof value === 'string' && value.trim() === '' ? undefined : value;

export class ManagerStudentListQueryDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize = 20;

  @IsOptional()
  @Transform(blankToUndefined)
  @IsString()
  @Length(1, 120)
  query?: string;

  @IsOptional()
  @Transform(blankToUndefined)
  @IsString()
  @Length(1, 60)
  educationLevel?: string;

  @IsOptional()
  @Transform(blankToUndefined)
  @IsString()
  @Length(1, 60)
  grade?: string;

  @IsOptional()
  @Transform(blankToUndefined)
  @IsString()
  @Length(1, 100)
  fieldOfStudy?: string;

  @IsOptional()
  @Transform(blankToUndefined)
  @IsString()
  @Length(1, 20)
  serviceType?: string;

  @IsOptional()
  @Transform(blankToUndefined)
  @IsString()
  @Length(1, 30)
  registrationStatus?: string;

  @IsOptional()
  @IsIn(MANAGER_PHOTO_STATUS_FILTERS)
  photoStatus: ManagerPhotoStatusFilter = 'all';

  @IsOptional()
  @IsIn(MANAGER_STUDENT_SORT_KEYS)
  sortBy: ManagerStudentSortKey = 'createdAt';

  @IsOptional()
  @IsIn(MANAGER_STUDENT_SORT_DIRECTIONS)
  sortOrder: ManagerSortDirection = 'desc';
}
