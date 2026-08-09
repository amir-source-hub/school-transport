import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, IsUUID, Length, Max, Min } from 'class-validator';

export const ACCEPTED_PHOTO_MIMES = ['image/jpeg', 'image/png'] as const;
export const STANDARD_REJECTION_REASONS = [
  'BLURRED',
  'CROPPED_FACE',
  'GLASSES_GLARE',
  'FILTER_OR_EDITING',
  'GROUP_OR_MULTIPLE_PEOPLE',
  'NOT_A_RECENT_COLOR_PHOTO',
  'WRONG_BACKGROUND',
  'HEAD_COVERING_VIOLATION',
  'LOW_QUALITY',
  'OTHER',
] as const;

export class AuthorizePhotoUploadDto {
  @IsOptional() @IsUUID() studentId?: string;
  @IsIn(ACCEPTED_PHOTO_MIMES) declaredMime!: (typeof ACCEPTED_PHOTO_MIMES)[number];
  @Type(() => Number) @IsInt() @Min(1) declaredSize!: number;
}

export class LinkPhotoUploadDto {
  @IsUUID() studentId!: string;
}

export class RejectPhotoUploadDto {
  @IsIn(STANDARD_REJECTION_REASONS) reason!: (typeof STANDARD_REJECTION_REASONS)[number];
  @IsOptional() @IsString() @Length(2, 500) detail?: string;
}

export class AdminPhotoListQueryDto {
  @Type(() => Number) @IsInt() @Min(1) page = 1;
  @Type(() => Number) @IsInt() @Min(5) @Max(50) pageSize = 10;
  @IsOptional()
  @IsIn([
    'PENDING_REVIEW',
    'APPROVED',
    'REJECTED',
    'FAILED',
    'EXPIRED',
    'SUPERSEDED',
  ])
  status?: string;
}
