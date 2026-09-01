import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';

const digits = ({ value }: { value: unknown }) =>
  typeof value === 'string'
    ? value.replace(/[۰-۹]/g, (char) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(char))).replace(/[٠-٩]/g, (char) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(char)))
    : value;
const clean = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);
const persianName = /^[\u0600-\u06FF\s‌-]+$/;
const persianText = /^[\u0600-\u06FF\u200c\s\d۰-۹٠-٩،؛,.()\-/]+$/;

export class DriverDocumentUploadDto {
  @IsIn(['DRIVER_PHOTO', 'VEHICLE_PHOTO']) documentType!: 'DRIVER_PHOTO' | 'VEHICLE_PHOTO';
  @IsIn(['image/jpeg', 'image/png']) mimeType!: 'image/jpeg' | 'image/png';
  @Type(() => Number) @IsInt() @Min(1) @Max(5 * 1024 * 1024) size!: number;
}

export class DriverEnrollmentDto {
  @Transform(clean) @IsString() @Length(1, 100) @Matches(persianName) firstName!: string;
  @Transform(clean) @IsString() @Length(1, 100) @Matches(persianName) lastName!: string;
  @Transform(clean) @IsString() @Length(1, 100) @Matches(persianName) fatherName!: string;
  @Transform(digits) @IsString() @Matches(/^\d{10}$/) nationalId!: string;
  @Transform(digits) @Matches(/^09\d{9}$/) phoneNumber!: string;
  @IsIn(['MALE', 'FEMALE']) gender!: 'MALE' | 'FEMALE';
  @Transform(clean) @IsIn(['BELOW_DIPLOMA', 'DIPLOMA', 'ASSOCIATE', 'BACHELOR', 'MASTER', 'DOCTORATE']) education!: string;
  @Transform(digits) @IsOptional() @ValidateIf((_, value) => value !== '') @Matches(/^09\d{9}$/) secondaryPhoneNumber?: string;
  @Transform(digits) @IsOptional() @ValidateIf((_, value) => value !== '') @Matches(/^\d{8}$/) homePhoneNumber?: string;
  @Transform(digits) @Matches(/^09\d{9}$/) emergencyPhoneNumber!: string;
  @Matches(/^\d{4}-\d{2}-\d{2}$/) licenseExpiresAt!: string;
  @Transform(clean) @IsString() @Length(5, 500) @Matches(persianText) streetAddress!: string;
  @Transform(digits) @Matches(/^\d{10}$/) postalCode!: string;
  @Transform(clean) @IsString() @Length(1, 100) @Matches(persianText) province!: string;
  @Transform(clean) @IsString() @Length(1, 100) @Matches(persianText) city!: string;
  @Transform(clean) @IsString() @Length(1, 50) municipalityDistrict!: string;
  @Type(() => Number) @IsNumber() @Min(-90) @Max(90) latitude!: number;
  @Type(() => Number) @IsNumber() @Min(-180) @Max(180) longitude!: number;
  @Transform(clean) @IsOptional() @ValidateIf((_, value) => value !== '') @IsString() @Length(1, 200) @Matches(persianText) referrerName?: string;
  @Transform(digits) @IsOptional() @ValidateIf((_, value) => value !== '') @Matches(/^09\d{9}$/) referrerPhoneNumber?: string;
  @IsIn(['CAR', 'VAN', 'MINIBUS', 'BUS']) vehicleType!: 'CAR' | 'VAN' | 'MINIBUS' | 'BUS';
  @Transform(clean) @IsString() @Length(1, 100) @Matches(persianText) system!: string;
  @Type(() => Number) @IsInt() @Min(1300) @Max(1500) modelYear!: number;
  @Transform(digits) @Matches(/^\d{2}[بجددزطظعفقکلمنوهی]\d{3}\d{2}$/) plateNumber!: string;
  @Matches(/^\d{4}-\d{2}-\d{2}$/) insuranceExpiresAt!: string;
  @Matches(/^\d{4}-\d{2}-\d{2}$/) technicalInspectionExpiresAt!: string;
  @IsIn(['PERSONAL', 'TAXI']) usageType!: 'PERSONAL' | 'TAXI';
  @IsIn(['SELF', 'OTHER']) ownershipType!: 'SELF' | 'OTHER';
  @IsUUID() driverPhotoUploadId!: string;
  @IsUUID() vehiclePhotoUploadId!: string;
  @IsBoolean() contractFullyRead!: boolean;
  @IsBoolean() contractAccepted!: boolean;
}

export class UpdateDriverProfileDto {
  @Transform(digits) @IsOptional() @ValidateIf((_, value) => value !== '') @Matches(/^09\d{9}$/) secondaryPhoneNumber?: string;
  @Transform(digits) @IsOptional() @ValidateIf((_, value) => value !== '') @Matches(/^\d{8}$/) homePhoneNumber?: string;
  @Transform(digits) @IsOptional() @Matches(/^09\d{9}$/) emergencyPhoneNumber?: string;
  @Transform(clean) @IsOptional() @IsString() @Length(5, 500) @Matches(persianText) streetAddress?: string;
  @Transform(digits) @IsOptional() @Matches(/^\d{10}$/) postalCode?: string;
  @Transform(clean) @IsOptional() @IsString() @Length(1, 100) @Matches(persianText) province?: string;
  @Transform(clean) @IsOptional() @IsString() @Length(1, 100) @Matches(persianText) city?: string;
  @Transform(clean) @IsOptional() @IsString() @Length(1, 50) municipalityDistrict?: string;
  @Transform(clean) @IsOptional() @ValidateIf((_, value) => value !== '') @IsString() @Length(1, 200) @Matches(persianText) referrerName?: string;
  @Transform(digits) @IsOptional() @ValidateIf((_, value) => value !== '') @Matches(/^09\d{9}$/) referrerPhoneNumber?: string;
}

export class AssignDriverToStudentDto {
  @IsUUID() driverId!: string;
  @Transform(clean) @IsString() @Length(4, 20) academicYear!: string;
  @Matches(/^\d{2}:\d{2}$/) toSchoolStartTime!: string;
  @Matches(/^\d{2}:\d{2}$/) toSchoolArrivalTime!: string;
  @Matches(/^\d{2}:\d{2}$/) fromSchoolStartTime!: string;
  @Matches(/^\d{2}:\d{2}$/) fromSchoolArrivalTime!: string;
  @IsInt({ each: true }) @Min(0, { each: true }) @Max(6, { each: true }) activeWeekdays!: number[];
}
