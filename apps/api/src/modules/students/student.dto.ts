import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
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
    return 'nationalId must be a valid Iranian national ID.';
  }
}

export class CreateStudentDto {
  @IsString()
  @IsNotEmpty()
  schoolId!: string;

  @IsString()
  @IsNotEmpty()
  firstName!: string;

  @IsString()
  @IsNotEmpty()
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
  grade!: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  className?: string;
}

export class UpdateStudentDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  firstName?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  lastName?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  grade?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  className?: string;
}
