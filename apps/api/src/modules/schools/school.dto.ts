import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  ArrayNotEmpty,
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  Length,
  Matches,
  ValidateNested,
} from 'class-validator';
import { normalizeIranianDigits } from '../../common/iranian-national-id';

export const SCHOOL_TYPES = [
  'PUBLIC',
  'PRIVATE',
  'NEMOONE_DOLATI',
  'GIFTED',
  'SHAHED',
  'BOARDING',
  'SPECIAL',
  'INTERNATIONAL',
] as const;
export const GENDER_TYPES = ['MALE', 'FEMALE', 'MIXED'] as const;

export class EducationOptionDto {
  @IsString()
  @Length(1, 100)
  level!: string;
  @IsArray()
  @ArrayMaxSize(12)
  @IsString({ each: true })
  @Length(1, 50, { each: true })
  grades!: string[];
}

export class CreateSchoolDto {
  @IsString() @Length(1, 200) name!: string;
  @IsIn(SCHOOL_TYPES) schoolType!: string;
  @IsIn(GENDER_TYPES) genderType!: string;
  @IsString() @Length(1, 100) province!: string;
  @IsString() @Length(1, 100) city!: string;
  @IsOptional() @IsString() @Length(1, 50) district?: string;
  @IsString() @Length(1, 500) address!: string;
  @Transform(({ value }) =>
    typeof value === 'string' ? normalizeIranianDigits(value).trim() : value,
  )
  @IsString()
  @Matches(/^0[1-8]\d{9}$/, { message: 'شماره تلفن مدرسه باید ۱۱ رقم و با پیش‌شماره معتبر باشد.' })
  phoneNumber!: string;
  @Transform(({ value }) =>
    typeof value === 'string' ? normalizeIranianDigits(value).trim() : value,
  )
  @IsString()
  @Matches(/^09\d{9}$/, { message: 'شماره همراه مدیر باید ۱۱ رقم و با ۰۹ شروع شود.' })
  managerPhone!: string;
  @IsString() @Length(1, 100) managerName!: string;
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'ساعت شروع باید با قالب ساعت:دقیقه باشد.' })
  openingTime!: string;
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'ساعت پایان باید با قالب ساعت:دقیقه باشد.' })
  closingTime!: string;
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => EducationOptionDto)
  educationOptions?: EducationOptionDto[];
}

export class UpdateSchoolDto {
  @IsOptional() @IsString() @Length(1, 200) name?: string;
  @IsOptional() @IsIn(SCHOOL_TYPES) schoolType?: string;
  @IsOptional() @IsIn(GENDER_TYPES) genderType?: string;
  @IsOptional() @IsString() @Length(1, 100) province?: string;
  @IsOptional() @IsString() @Length(1, 100) city?: string;
  @IsOptional() @IsString() @Length(1, 50) district?: string;
  @IsOptional() @IsString() @Length(1, 500) address?: string;
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? normalizeIranianDigits(value).trim() : value,
  )
  @IsString()
  @Matches(/^0[1-8]\d{9}$/, { message: 'شماره تلفن مدرسه باید ۱۱ رقم و با پیش‌شماره معتبر باشد.' })
  phoneNumber?: string;
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? normalizeIranianDigits(value).trim() : value,
  )
  @IsString()
  @Matches(/^09\d{9}$/, { message: 'شماره همراه مدیر باید ۱۱ رقم و با ۰۹ شروع شود.' })
  managerPhone?: string;
  @IsOptional() @IsString() @Length(1, 100) managerName?: string;
  @IsOptional() @IsString() @Matches(/^([01]\d|2[0-3]):[0-5]\d$/) openingTime?: string;
  @IsOptional() @IsString() @Matches(/^([01]\d|2[0-3]):[0-5]\d$/) closingTime?: string;
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => EducationOptionDto)
  educationOptions?: EducationOptionDto[];
  @IsOptional() @IsBoolean() isActive?: boolean;
}
