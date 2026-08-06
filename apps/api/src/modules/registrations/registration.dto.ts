import { Transform, Type } from 'class-transformer';
import { IsDateString, IsIn, IsNumber, IsOptional, IsString, IsUUID, Length, Matches, Max, Min, ValidateNested } from 'class-validator';
import { normalizeIranianDigits } from '../../common/iranian-national-id';

const digits = ({ value }: { value: unknown }) => typeof value === 'string' ? normalizeIranianDigits(value).trim() : value;
class PersonDto {
  @IsString() @Length(1, 100) firstName!: string;
  @IsString() @Length(1, 100) lastName!: string;
  @Transform(digits) @Matches(/^\d{10}$/) nationalId!: string;
}
class ParentDto extends PersonDto { @Transform(digits) @Matches(/^09\d{9}$/) phoneNumber!: string; }
class StudentDto extends PersonDto {
  @IsOptional() @IsUUID() id?: string;
  @IsOptional() @Transform(digits) @IsDateString({ strict: true }) birthDate?: string;
  @IsOptional() @IsIn(['MALE', 'FEMALE']) gender?: string;
}
class EmergencyDto {
  @IsString() @Length(1, 100) firstName!: string;
  @IsString() @Length(1, 100) lastName!: string;
  @IsString() @Length(1, 50) relationship!: string;
  @Transform(digits) @Matches(/^09\d{9}$/) phoneNumber!: string;
}
class AddressDto {
  @IsString() @Length(1, 100) title!: string;
  @IsString() @Length(1, 100) province!: string;
  @IsString() @Length(1, 100) city!: string;
  @IsOptional() @IsString() @Length(1, 50) district?: string;
  @IsString() @Length(1, 500) streetAddress!: string;
  @Transform(digits) @Matches(/^\d{10}$/) postalCode!: string;
  @Type(() => Number) @IsNumber() @Min(-90) @Max(90) latitude!: number;
  @Type(() => Number) @IsNumber() @Min(-180) @Max(180) longitude!: number;
}
class SchoolDto {
  @IsUUID() schoolId!: string;
  @IsString() @Length(1, 100) educationLevel!: string;
  @IsString() @Length(1, 50) grade!: string;
}
class ServiceDto {
  @IsIn(['BUS', 'MINIBUS', 'CAR', 'VAN']) serviceType!: string;
  @IsIn(['FULL', 'INSTALLMENTS']) paymentPlanType!: 'FULL' | 'INSTALLMENTS';
  @IsOptional() @IsString() @Length(1, 1000) parentNotes?: string;
}
export class GuidedEnrollmentDto {
  @ValidateNested() @Type(() => StudentDto) student!: StudentDto;
  @ValidateNested() @Type(() => ParentDto) father!: ParentDto;
  @ValidateNested() @Type(() => ParentDto) mother!: ParentDto;
  @ValidateNested() @Type(() => EmergencyDto) emergencyContact!: EmergencyDto;
  @ValidateNested() @Type(() => AddressDto) address!: AddressDto;
  @ValidateNested() @Type(() => SchoolDto) school!: SchoolDto;
  @ValidateNested() @Type(() => ServiceDto) service!: ServiceDto;
}
export class CreateRegistrationDto {
  @IsUUID() studentId!: string;
  @Matches(/^14\d{2}-14\d{2}$/) academicYear!: string;
  @IsIn(['ONE_WAY', 'ROUND_TRIP']) serviceType!: string;
  @IsOptional() @IsDateString({ strict: true }) requestedStartDate?: string;
  @IsOptional() @IsString() @Length(1, 1000) parentNotes?: string;
}
export class RejectRegistrationDto { @IsOptional() @IsString() @Length(1, 1000) reason?: string; }
export class CorrectionDto { @IsString() @Length(1, 1000) message!: string; }
