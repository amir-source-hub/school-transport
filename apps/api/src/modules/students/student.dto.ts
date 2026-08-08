import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Length,
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
    return 'nationalId must contain between 1 and 20 digits.';
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
}

export class UpdateStudentDto {
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
}

export class AdminCreateStudentDto extends CreateStudentDto {
  @IsUUID()
  userId!: string;
}

export class ArchiveStudentDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @Length(1, 500)
  reason?: string;
}
