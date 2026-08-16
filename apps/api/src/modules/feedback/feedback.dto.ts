import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  IsDateString,
  Length,
  Matches,
  Max,
  Min,
} from 'class-validator';

export const FEEDBACK_CATEGORIES = [
  'SERVICE',
  'DRIVER',
  'SCHOOL',
  'BILLING',
  'APP',
  'SUGGESTION',
  'SAFETY',
] as const;
const PLAIN_TEXT = /^(?![\s\S]*<[^>]+>)[\s\S]*$/;
const CONTACT_TOPICS = ['registration', 'payment', 'contract', 'technical', 'other'] as const;

export class CreatePublicContactDto {
  @IsString() @Length(2, 120) @Matches(PLAIN_TEXT) name!: string;
  @IsIn(CONTACT_TOPICS) topic!: (typeof CONTACT_TOPICS)[number];
  @IsString() @Length(10, 2000) @Matches(PLAIN_TEXT) message!: string;
}

export class CreateFeedbackDto {
  @IsIn(FEEDBACK_CATEGORIES) category!: (typeof FEEDBACK_CATEGORIES)[number];
  @IsString() @Length(3, 120) @Matches(PLAIN_TEXT) subject!: string;
  @IsString() @Length(10, 2000) @Matches(PLAIN_TEXT) message!: string;
  @IsOptional() @IsUUID() studentId?: string;
}
export class FeedbackQueryDto {
  @Type(() => Number) @IsInt() @Min(1) page = 1;
  @Type(() => Number) @IsInt() @Min(5) @Max(50) pageSize = 10;
  @IsOptional() @IsIn(['NEW', 'READ', 'ESCALATED', 'ANSWERED', 'CLOSED']) status?: string;
  @IsOptional() @IsIn(FEEDBACK_CATEGORIES) category?: string;
  @IsOptional() @IsIn(['PARENT', 'SCHOOL_MANAGER', 'PUBLIC']) senderType?: string;
  @IsOptional() @IsDateString({ strict: true }) snapshotAt?: string;
}
export class AssignFeedbackDto {
  @IsUUID() assigneeId!: string;
  @Type(() => Number) @IsInt() @Min(1) version!: number;
}
export class RespondFeedbackDto {
  @IsString() @Length(2, 2000) @Matches(PLAIN_TEXT) response!: string;
  @Type(() => Number) @IsInt() @Min(1) version!: number;
}
export class VersionDto {
  @Type(() => Number) @IsInt() @Min(1) version!: number;
}
