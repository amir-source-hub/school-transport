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
    ? value
        .replace(/[۰-۹]/g, (char) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(char)))
        .replace(/[٠-٩]/g, (char) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(char)))
    : value;
const clean = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);
const persianName = /^[\u0600-\u06FF\s‌-]+$/;
const persianText = /^[\u0600-\u06FF\u200c\s\d۰-۹٠-٩،؛,.()\-/]+$/;

export class DriverDocumentUploadDto {
  @IsIn([
    'DRIVER_PHOTO',
    'VEHICLE_PHOTO',
    'NATIONAL_CARD_FRONT',
    'BIRTH_CERTIFICATE_PAGE_1',
    'BIRTH_CERTIFICATE_PAGE_2',
    'DRIVER_LICENSE_FRONT',
    'DRIVER_LICENSE_BACK',
    'CRIMINAL_RECORD_CERTIFICATE',
    'ADDICTION_TEST_CERTIFICATE',
    'EDUCATION_CERTIFICATE',
    'POSTAL_CODE_CONFIRMATION',
    'SCHOOL_SERVICE_INSURANCE_ENDORSEMENT',
    'TAXI_OPERATION_LICENSE',
    'VEHICLE_CARD_FRONT',
    'VEHICLE_CARD_BACK',
    'VEHICLE_TITLE_DOCUMENT',
    'TECHNICAL_INSPECTION_DOCUMENT',
    'INSURANCE_POLICY_DOCUMENT',
  ])
  documentType!: string;
  @IsIn(['image/jpeg', 'image/png', 'application/pdf'])
  mimeType!: 'image/jpeg' | 'image/png' | 'application/pdf';
  @Type(() => Number) @IsInt() @Min(1) @Max(5 * 1024 * 1024) size!: number;
}

export class DriverEnrollmentDto {
  @Transform(clean) @IsString() @Length(1, 100) @Matches(persianName) firstName!: string;
  @Transform(clean) @IsString() @Length(1, 100) @Matches(persianName) lastName!: string;
  @Transform(clean) @IsString() @Length(1, 100) @Matches(persianName) fatherName!: string;
  @Transform(digits) @IsString() @Matches(/^\d{10}$/) nationalId!: string;
  @Transform(digits) @Matches(/^09\d{9}$/) phoneNumber!: string;
  @IsIn(['MALE', 'FEMALE']) gender!: 'MALE' | 'FEMALE';
  @Transform(clean)
  @IsIn(['BELOW_DIPLOMA', 'DIPLOMA', 'ASSOCIATE', 'BACHELOR', 'MASTER', 'DOCTORATE'])
  education!: string;
  @Transform(digits)
  @Matches(/^IR\d{24}$/, { message: 'شماره شبا باید با IR شروع شود و دقیقاً ۲۴ رقم داشته باشد.' })
  iban!: string;
  @Transform(digits)
  @Matches(/^\d{16}$/, { message: 'شماره کارت باید دقیقاً ۱۶ رقم داشته باشد.' })
  cardNumber!: string;
  @Transform(clean) @IsString() @Length(1, 100) @Matches(persianName) bankName!: string;
  @Transform(digits)
  @IsOptional()
  @ValidateIf((_, value) => value !== '')
  @Matches(/^09\d{9}$/)
  secondaryPhoneNumber?: string;
  @Transform(digits) @Matches(/^\d{11}$/) homePhoneNumber!: string;
  @Transform(clean) @IsString() @Length(1, 100) @Matches(persianName) emergencyFirstName!: string;
  @Transform(clean) @IsString() @Length(1, 100) @Matches(persianName) emergencyLastName!: string;
  @Transform(clean)
  @IsString()
  @Length(1, 100)
  @Matches(persianName)
  emergencyRelationship!: string;
  @Transform(digits) @Matches(/^09\d{9}$/) emergencyPhoneNumber!: string;
  @Transform(clean) @IsString() @Length(5, 500) @Matches(persianText) streetAddress!: string;
  @Transform(digits) @Matches(/^\d{10}$/) postalCode!: string;
  @Transform(clean) @IsString() @Length(1, 100) @Matches(persianText) province!: string;
  @Transform(clean) @IsString() @Length(1, 100) @Matches(persianText) city!: string;
  @Transform(clean) @IsString() @Length(1, 50) municipalityDistrict!: string;
  @Type(() => Number) @IsNumber() @Min(-90) @Max(90) latitude!: number;
  @Type(() => Number) @IsNumber() @Min(-180) @Max(180) longitude!: number;
  @Transform(clean)
  @IsOptional()
  @ValidateIf((_, value) => value !== '')
  @IsString()
  @Length(1, 200)
  @Matches(persianName)
  referrerName?: string;
  @Transform(digits)
  @IsOptional()
  @ValidateIf((_, value) => value !== '')
  @Matches(/^09\d{9}$/)
  referrerPhoneNumber?: string;
  @IsIn(['CAR', 'VAN', 'MINIBUS', 'BUS']) vehicleType!: 'CAR' | 'VAN' | 'MINIBUS' | 'BUS';
  @Transform(clean) @IsString() @Length(1, 100) @Matches(persianText) system!: string;
  @Type(() => Number) @IsInt() @Min(1300) @Max(1500) modelYear!: number;
  @Transform(digits)
  @Matches(/^\d{2}[بتجچحخدذرزژسصضطظعغفقکگلمنوهی]\d{3}\d{2}$/)
  plateNumber!: string;
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
  @Transform(digits) @IsOptional() @Matches(/^IR\d{24}$/) iban?: string;
  @Transform(digits) @IsOptional() @Matches(/^\d{16}$/) cardNumber?: string;
  @Transform(clean) @IsOptional() @IsString() @Length(1, 100) bankName?: string;
  @Transform(digits)
  @IsOptional()
  @ValidateIf((_, value) => value !== '')
  @Matches(/^09\d{9}$/)
  secondaryPhoneNumber?: string;
  @Transform(digits)
  @IsOptional()
  @ValidateIf((_, value) => value !== '')
  @Matches(/^\d{11}$/)
  homePhoneNumber?: string;
  @Transform(digits) @IsOptional() @Matches(/^09\d{9}$/) emergencyPhoneNumber?: string;
  @Transform(clean)
  @IsOptional()
  @IsString()
  @Length(5, 500)
  @Matches(persianText)
  streetAddress?: string;
  @Transform(digits) @IsOptional() @Matches(/^\d{10}$/) postalCode?: string;
  @Transform(clean)
  @IsOptional()
  @IsString()
  @Length(1, 100)
  @Matches(persianText)
  province?: string;
  @Transform(clean) @IsOptional() @IsString() @Length(1, 100) @Matches(persianText) city?: string;
  @Transform(clean) @IsOptional() @IsString() @Length(1, 50) municipalityDistrict?: string;
  @Transform(clean)
  @IsOptional()
  @ValidateIf((_, value) => value !== '')
  @IsString()
  @Length(1, 200)
  @Matches(persianText)
  referrerName?: string;
  @Transform(digits)
  @IsOptional()
  @ValidateIf((_, value) => value !== '')
  @Matches(/^09\d{9}$/)
  referrerPhoneNumber?: string;
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

export class CreateTransportRouteDto {
  @IsUUID() driverId!: string;
  @IsUUID() schoolId!: string;
  @Transform(clean) @IsString() @Length(2, 100) title!: string;
  @Transform(clean) @IsString() @Length(4, 20) academicYear!: string;
  @IsIn(['TO_SCHOOL', 'FROM_SCHOOL', 'ROUND_TRIP']) direction!:
    'TO_SCHOOL' | 'FROM_SCHOOL' | 'ROUND_TRIP';
  @Matches(/^\d{2}:\d{2}$/) scheduledStartTime!: string;
  @Matches(/^\d{2}:\d{2}$/) scheduledArrivalTime!: string;
  @Transform(clean) @IsOptional() @IsString() @Length(0, 500) areaDescription?: string;
  @IsOptional() @IsInt() @Min(0) contractPriceRials?: number;
  @Transform(clean)
  @IsOptional()
  @Matches(/^1[34]\d{2}\/(0[1-9]|1[0-2])\/(0[1-9]|[12]\d|3[01])$/)
  contractDate?: string;
  @IsInt({ each: true }) @Min(0, { each: true }) @Max(6, { each: true }) activeWeekdays!: number[];
}

export class AdminUpdateDriverDto extends UpdateDriverProfileDto {
  @Transform(clean) @IsOptional() @IsString() @Length(1, 100) firstName?: string;
  @Transform(clean) @IsOptional() @IsString() @Length(1, 100) lastName?: string;
  @Transform(clean) @IsOptional() @IsString() @Length(1, 100) fatherName?: string;
  @Transform(digits) @IsOptional() @Matches(/^\d{10}$/) nationalId?: string;
  @Transform(digits) @IsOptional() @Matches(/^09\d{9}$/) phoneNumber?: string;
  @Transform(clean) @IsOptional() @IsIn(['MALE', 'FEMALE']) gender?: string;
  @Transform(clean) @IsOptional() @IsString() @Length(1, 100) education?: string;
  @Transform(clean) @IsOptional() @IsString() @Length(1, 100) emergencyFirstName?: string;
  @Transform(clean) @IsOptional() @IsString() @Length(1, 100) emergencyLastName?: string;
  @Transform(clean) @IsOptional() @IsString() @Length(1, 100) emergencyRelationship?: string;
  @Type(() => Number) @IsOptional() @IsNumber() @Min(-90) @Max(90) latitude?: number;
  @Type(() => Number) @IsOptional() @IsNumber() @Min(-180) @Max(180) longitude?: number;
  @IsOptional() @IsIn(['CAR', 'VAN', 'MINIBUS', 'BUS']) vehicleType?: string;
  @Transform(clean) @IsOptional() @IsString() @Length(1, 100) system?: string;
  @Type(() => Number) @IsOptional() @IsInt() @Min(1300) @Max(1500) modelYear?: number;
  @Transform(digits)
  @IsOptional()
  @Matches(/^\d{2}[بتجچحخدذرزژسصضطظعغفقکگلمنوهی]\d{5}$/)
  plateNumber?: string;
  @Type(() => Number) @IsOptional() @IsInt() @Min(1) capacity?: number;
  @IsOptional() @IsIn(['PERSONAL', 'TAXI']) usageType?: string;
  @IsOptional() @IsIn(['SELF', 'OTHER']) ownershipType?: string;
  @IsOptional() @Matches(/^\d{4}-\d{2}-\d{2}$/) insuranceExpiresAt?: string;
  @IsOptional() @Matches(/^\d{4}-\d{2}-\d{2}$/) technicalInspectionExpiresAt?: string;
}

export class UpdateTransportRouteDto {
  @IsOptional() @IsUUID() driverId?: string;
  @IsOptional() @IsUUID() schoolId?: string;
  @Transform(clean) @IsOptional() @IsString() @Length(2, 100) title?: string;
  @Transform(clean) @IsOptional() @IsString() @Length(4, 20) academicYear?: string;
  @IsOptional() @IsIn(['TO_SCHOOL', 'FROM_SCHOOL', 'ROUND_TRIP']) direction?:
    'TO_SCHOOL' | 'FROM_SCHOOL' | 'ROUND_TRIP';
  @Transform(clean) @IsOptional() @IsString() @Length(0, 500) areaDescription?: string;
  @IsOptional() @IsInt() @Min(0) contractPriceRials?: number;
  @Transform(clean)
  @IsOptional()
  @Matches(/^1[34]\d{2}\/(0[1-9]|1[0-2])\/(0[1-9]|[12]\d|3[01])$/)
  contractDate?: string;
  @IsOptional()
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(6, { each: true })
  activeWeekdays?: number[];
}

export class AddStudentToTransportRouteDto {
  @IsUUID() studentId!: string;
  @IsInt() @Min(1) pickupOrder!: number;
  @Transform(clean) @IsOptional() @IsString() @Length(0, 500) notes?: string;
}

export class RejectDriverDocumentDto {
  @Transform(clean) @IsOptional() @IsString() @Length(0, 500) reason?: string;
}

export class AssignStudentRoutesDto {
  @IsUUID() studentId!: string;
  @IsUUID() toSchoolRouteId!: string;
  @IsUUID() fromSchoolRouteId!: string;
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/) toSchoolStopTime!: string;
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/) fromSchoolStopTime!: string;
}
