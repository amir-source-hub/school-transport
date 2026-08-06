import { Transform, Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsBoolean, IsIn, IsOptional, IsString, Length, Matches, ValidateNested } from 'class-validator';
import { normalizeIranianDigits } from '../../common/iranian-national-id';

export class EducationOptionDto {
  @IsString() @Length(1, 100)
  level!: string;
  @IsArray() @ArrayMaxSize(12) @IsString({ each: true }) @Length(1, 50, { each: true })
  grades!: string[];
}

export class CreateSchoolDto {
  @IsString() @Length(1, 200) name!: string;
  @IsIn(['PUBLIC', 'PRIVATE']) schoolType!: string;
  @IsIn(['MALE', 'FEMALE', 'MIXED']) genderType!: string;
  @IsString() @Length(1, 100) province!: string;
  @IsString() @Length(1, 100) city!: string;
  @IsOptional() @IsString() @Length(1, 50) district?: string;
  @IsString() @Length(1, 500) address!: string;
  @IsOptional() @Transform(({ value }) => typeof value === 'string' ? normalizeIranianDigits(value).trim() : value) @IsString() @Matches(/^0\d{9,10}$/) phoneNumber?: string;
  @IsOptional() @IsArray() @ArrayMaxSize(20) @ValidateNested({ each: true }) @Type(() => EducationOptionDto)
  educationOptions?: EducationOptionDto[];
}

export class UpdateSchoolDto {
  @IsOptional() @IsString() @Length(1, 200) name?: string;
  @IsOptional() @IsIn(['PUBLIC', 'PRIVATE']) schoolType?: string;
  @IsOptional() @IsIn(['MALE', 'FEMALE', 'MIXED']) genderType?: string;
  @IsOptional() @IsString() @Length(1, 100) province?: string;
  @IsOptional() @IsString() @Length(1, 100) city?: string;
  @IsOptional() @IsString() @Length(1, 50) district?: string;
  @IsOptional() @IsString() @Length(1, 500) address?: string;
  @IsOptional() @Transform(({ value }) => typeof value === 'string' ? normalizeIranianDigits(value).trim() : value) @IsString() @Matches(/^0\d{9,10}$/) phoneNumber?: string;
  @IsOptional() @IsArray() @ArrayMaxSize(20) @ValidateNested({ each: true }) @Type(() => EducationOptionDto)
  educationOptions?: EducationOptionDto[];
  @IsOptional() @IsBoolean() isActive?: boolean;
}
