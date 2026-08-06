import { Type } from 'class-transformer';
import { IsIn, IsInt, Max, Min } from 'class-validator';

export const REPORT_PREVIEW_SECTIONS = [
  'students',
  'families',
  'registrations',
  'payments',
  'contracts',
] as const;

export type ReportPreviewSection = (typeof REPORT_PREVIEW_SECTIONS)[number];

export class ReportPreviewQueryDto {
  @IsIn(REPORT_PREVIEW_SECTIONS)
  section: ReportPreviewSection = 'students';

  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @Type(() => Number)
  @IsInt()
  @Min(5)
  @Max(50)
  pageSize = 10;
}

