import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Matches,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { normalizeIranianDigits } from '../../../common/iranian-national-id';
const digits = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? normalizeIranianDigits(value).trim() : value;
export class ParentInputDto {
  @IsString() @Length(1, 100) firstName!: string;
  @IsString() @Length(1, 100) lastName!: string;
  @Transform(digits) @Matches(/^\d{10}$/, { message: 'کد ملی باید دقیقاً ۱۰ رقم باشد.' }) nationalId!: string;
  @Transform(digits) @Matches(/^09\d{9}$/) phoneNumber!: string;
}
class AddressInputDto {
  @IsString() @Length(1, 100) title!: string;
  @IsString() @Length(1, 100) province!: string;
  @IsString() @Length(1, 100) city!: string;
  @IsOptional() @IsString() @Length(1, 50) district?: string;
  @IsString() @Length(1, 500) streetAddress!: string;
  @IsOptional() @Transform(digits) @Matches(/^\d{10}$/) postalCode?: string;
}
class EmergencyInputDto {
  @IsString() @Length(1, 100) firstName!: string;
  @IsString() @Length(1, 100) lastName!: string;
  @IsString() @Length(1, 50) relationship!: string;
  @Transform(digits) @Matches(/^09\d{9}$/) phoneNumber!: string;
}
export class CompleteFamilyDto {
  @ValidateNested() @Type(() => ParentInputDto) mother!: ParentInputDto;
  @ValidateNested() @Type(() => ParentInputDto) father!: ParentInputDto;
  @IsIn(['MOTHER', 'FATHER']) primaryParent!: 'MOTHER' | 'FATHER';
  @ValidateNested() @Type(() => AddressInputDto) address!: AddressInputDto;
  @ValidateNested() @Type(() => EmergencyInputDto) emergencyContact!: EmergencyInputDto;
}
export class UpdateProfileDto {
  @IsOptional() @IsString() @Length(1, 100) firstName?: string;
  @IsOptional() @IsString() @Length(1, 100) lastName?: string;
  @IsOptional() @Transform(digits) @Matches(/^\d{10}$/, { message: 'کد ملی باید دقیقاً ۱۰ رقم باشد.' }) nationalId?: string;
  @IsOptional() @Transform(digits) @Matches(/^09\d{9}$/) phoneNumber?: string;
  @IsOptional() @IsIn(['MOTHER', 'FATHER']) parentType?: string;
}
export class AddressMutationDto {
  @IsOptional() @IsString() @Length(1, 100) title?: string;
  @IsOptional() @IsString() @Length(1, 100) province?: string;
  @IsOptional() @IsString() @Length(1, 100) city?: string;
  @IsOptional() @IsString() @Length(1, 50) district?: string;
  @IsOptional() @IsString() @Length(1, 500) streetAddress?: string;
  @IsOptional() @Transform(digits) @Matches(/^\d{10}$/) postalCode?: string;
  @IsOptional() @IsNumber() @Min(-90) @Max(90) latitude?: number;
  @IsOptional() @IsNumber() @Min(-180) @Max(180) longitude?: number;
}
export class AddAddressDto {
  @IsString() @Length(1, 100) title!: string;
  @IsString() @Length(1, 100) province!: string;
  @IsString() @Length(1, 100) city!: string;
  @IsOptional() @IsString() @Length(1, 50) district?: string;
  @IsString() @Length(1, 500) streetAddress!: string;
  @IsOptional() @Transform(digits) @Matches(/^\d{10}$/) postalCode?: string;
  @IsOptional() @IsNumber() @Min(-90) @Max(90) latitude?: number;
  @IsOptional() @IsNumber() @Min(-180) @Max(180) longitude?: number;
}
export class EmergencyMutationDto {
  @IsOptional() @IsString() @Length(1, 100) firstName?: string;
  @IsOptional() @IsString() @Length(1, 100) lastName?: string;
  @IsOptional() @IsString() @Length(1, 50) relationship?: string;
  @IsOptional() @Transform(digits) @Matches(/^09\d{9}$/) phoneNumber?: string;
}
export class ParentTypeDto {
  @IsIn(['MOTHER', 'FATHER']) parentType!: 'MOTHER' | 'FATHER';
}
export class AdminCreateParentDto extends ParentInputDto {
  @IsIn(['MOTHER', 'FATHER']) parentType!: 'MOTHER' | 'FATHER';
  @IsOptional() @IsBoolean() isPrimaryContact?: boolean;
}
export class AdminUpdateParentDto extends UpdateProfileDto {
  @IsOptional() @IsBoolean() isPrimaryContact?: boolean;
}
