import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsNotEmpty,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  Validate,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { isIranianNationalId, normalizeIranianDigits } from './national-id';

@ValidatorConstraint({ name: 'iranianNationalId', async: false })
export class IranianNationalIdConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    return typeof value === 'string' && isIranianNationalId(value);
  }

  defaultMessage(): string {
    return 'nationalId must contain exactly 10 digits.';
  }
}

export class CreateStudentDto {
  @IsUUID()
  schoolId!: string;

  @IsString()
  @IsNotEmpty()
  @Length(1, 100)
  firstName!: string;

  @IsString()
  @IsNotEmpty()
  @Length(1, 100)
  lastName!: string;

  @Transform(({ value }) =>
    typeof value === 'string' ? normalizeIranianDigits(value).trim() : value,
  )
  @Validate(IranianNationalIdConstraint)
  nationalId!: string;

  @IsOptional()
  @IsDateString()
  birthDate?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  gender?: string;

  @IsString()
  @IsNotEmpty()
  @Length(1, 50)
  grade!: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @Length(1, 100)
  className?: string;

  @IsOptional() @IsString() @Length(1, 100) fatherName?: string;
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? normalizeIranianDigits(value).trim() : value,
  )
  @Matches(/^09\d{9}$/)
  phoneNumber?: string;
  @IsOptional() @IsString() @Length(1, 100) fieldOfStudy?: string;
}

export class UpdateStudentDto {
  @IsOptional()
  @IsUUID()
  schoolId?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @Length(1, 100)
  firstName?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @Length(1, 100)
  lastName?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @Length(1, 50)
  grade?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @Length(1, 100)
  className?: string;

  @IsOptional() @IsString() @Length(1, 100) fatherName?: string;
  @IsOptional() @IsDateString() birthDate?: string;
  @IsOptional() @IsIn(['MALE', 'FEMALE']) gender?: string;
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? normalizeIranianDigits(value).trim() : value,
  )
  @Matches(/^09\d{9}$/)
  phoneNumber?: string;
  @IsOptional() @IsString() @Length(1, 100) fieldOfStudy?: string;
}

export class AdminCreateStudentDto extends CreateStudentDto {
  @IsUUID()
  userId!: string;
}

export class AdminUpdateStudentDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @Length(1, 100)
  firstName?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @Length(1, 100)
  lastName?: string;

  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? normalizeIranianDigits(value).trim() : value,
  )
  @Validate(IranianNationalIdConstraint)
  nationalId?: string;

  @IsOptional()
  @IsDateString()
  birthDate?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  gender?: string;

  @IsOptional()
  @IsUUID()
  schoolId?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @Length(1, 100)
  educationLevel?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @Length(1, 50)
  grade?: string;

  @IsOptional()
  @IsDateString()
  expectedUpdatedAt?: string;
}

export class ArchiveStudentDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @Length(1, 500)
  reason?: string;
}
