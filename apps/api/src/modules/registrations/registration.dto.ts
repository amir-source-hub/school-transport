import { Transform, Type } from 'class-transformer';
import {
  IsDateString,
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
  ValidateNested,
} from 'class-validator';
import { normalizeIranianDigits } from '../../common/iranian-national-id';
import { REGISTRATION_STATUS_GROUP_VALUES } from './registration-status-groups';

const digits = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? normalizeIranianDigits(value).trim() : value;
const persianOnly = /^[^A-Za-z]*$/;
const persianOnlyMessage = 'فقط حروف فارسی مجاز است.';

class IdentityInputDto {
  @IsString({ message: 'نام باید متن باشد.' })
  @Length(1, 100, { message: 'نام باید بین ۱ تا ۱۰۰ نویسه باشد.' })
  @Matches(persianOnly, { message: persianOnlyMessage })
  firstName!: string;
  @IsString({ message: 'نام خانوادگی باید متن باشد.' })
  @Length(1, 100, { message: 'نام خانوادگی باید بین ۱ تا ۱۰۰ نویسه باشد.' })
  @Matches(persianOnly, { message: persianOnlyMessage })
  lastName!: string;
  @Transform(digits)
  @Matches(/^\d{1,10}$/, { message: 'کد ملی باید فقط عدد و حداکثر ۱۰ رقم باشد.' })
  nationalId!: string;
}

export class StudentInputDto extends IdentityInputDto {
  @IsString({ message: 'نام پدر باید متن باشد.' })
  @Length(1, 100, { message: 'نام پدر باید بین ۱ تا ۱۰۰ نویسه باشد.' })
  @Matches(persianOnly, { message: persianOnlyMessage })
  fatherName!: string;
  @IsOptional() @IsUUID(undefined, { message: 'شناسه دانشآموز معتبر نیست.' }) id?: string;
  @IsOptional()
  @Transform(digits)
  @IsDateString({ strict: true }, { message: 'تاریخ تولد باید معتبر باشد.' })
  birthDate?: string;
  @IsIn(['MALE', 'FEMALE'], { message: 'جنسیت باید پسر یا دختر باشد.' })
  gender!: string;
  @IsOptional()
  @Transform(digits)
  @Matches(/^09\d{9}$/, { message: 'شماره همراه باید با ۰۹ شروع شود و ۱۱ رقم باشد.' })
  phoneNumber?: string;
}

export class ParentContactInputDto extends IdentityInputDto {
  @Transform(digits)
  @Matches(/^09\d{9}$/, { message: 'شماره همراه باید با ۰۹ شروع شود و ۱۱ رقم باشد.' })
  phoneNumber!: string;
}

export class GuardianInputDto extends IdentityInputDto {
  @IsIn(['FATHER', 'MOTHER', 'OTHER'], { message: 'نسبت باید پدر، مادر یا سایر باشد.' })
  relationshipType!: 'FATHER' | 'MOTHER' | 'OTHER';
  @ValidateIf((o: GuardianInputDto) => o.relationshipType === 'OTHER')
  @IsString({ message: 'شرح نسبت را وارد کنید.' })
  @Length(1, 100, { message: 'شرح نسبت باید بین ۱ تا ۱۰۰ نویسه باشد.' })
  @Matches(persianOnly, { message: persianOnlyMessage })
  relationshipDescription?: string;
}

export class EmergencyContactInputDto {
  @IsString({ message: 'نام باید متن باشد.' })
  @Length(1, 100, { message: 'نام باید بین ۱ تا ۱۰۰ نویسه باشد.' })
  @Matches(persianOnly, { message: persianOnlyMessage })
  firstName!: string;
  @IsString({ message: 'نام خانوادگی باید متن باشد.' })
  @Length(1, 100, { message: 'نام خانوادگی باید بین ۱ تا ۱۰۰ نویسه باشد.' })
  @Matches(persianOnly, { message: persianOnlyMessage })
  lastName!: string;
  @IsString({ message: 'نسبت باید متن باشد.' })
  @Length(1, 50, { message: 'نسبت باید بین ۱ تا ۵۰ نویسه باشد.' })
  @Matches(persianOnly, { message: persianOnlyMessage })
  relationship!: string;
  @Transform(digits)
  @Matches(/^09\d{9}$/, { message: 'شماره همراه باید با ۰۹ شروع شود و ۱۱ رقم باشد.' })
  phoneNumber!: string;
}

export class AddressInputDto {
  @IsString({ message: 'عنوان نشانی باید متن باشد.' })
  @Length(1, 100, { message: 'عنوان نشانی باید بین ۱ تا ۱۰۰ نویسه باشد.' })
  @Matches(persianOnly, { message: persianOnlyMessage })
  title!: string;
  @IsString({ message: 'استان باید متن باشد.' })
  @Length(1, 100, { message: 'استان باید بین ۱ تا ۱۰۰ نویسه باشد.' })
  @Matches(persianOnly, { message: persianOnlyMessage })
  province!: string;
  @IsString({ message: 'شهر باید متن باشد.' })
  @Length(1, 100, { message: 'شهر باید بین ۱ تا ۱۰۰ نویسه باشد.' })
  @Matches(persianOnly, { message: persianOnlyMessage })
  city!: string;
  @IsString({ message: 'نشانی کامل باید متن باشد.' })
  @Length(1, 500, { message: 'نشانی کامل باید بین ۱ تا ۵۰۰ نویسه باشد.' })
  @Matches(persianOnly, { message: persianOnlyMessage })
  streetAddress!: string;
  @Transform(digits)
  @Matches(/^\d{10}$/, { message: 'کد پستی باید ۱۰ رقم باشد.' })
  postalCode!: string;
  @Type(() => Number)
  @IsNumber(undefined, { message: 'عرض جغرافیایی باید عدد باشد.' })
  @Min(-90, { message: 'عرض جغرافیایی باید بین ۹۰- و ۹۰ باشد.' })
  @Max(90, { message: 'عرض جغرافیایی باید بین ۹۰- و ۹۰ باشد.' })
  latitude!: number;
  @Type(() => Number)
  @IsNumber(undefined, { message: 'طول جغرافیایی باید عدد باشد.' })
  @Min(-180, { message: 'طول جغرافیایی باید بین ۱۸۰- و ۱۸۰ باشد.' })
  @Max(180, { message: 'طول جغرافیایی باید بین ۱۸۰- و ۱۸۰ باشد.' })
  longitude!: number;
}

export class SchoolInputDto {
  @IsUUID(undefined, { message: 'شناسه مدرسه معتبر نیست.' }) schoolId!: string;
  @IsString({ message: 'مقطع تحصیلی باید متن باشد.' })
  @Length(1, 100, { message: 'مقطع تحصیلی باید بین ۱ تا ۱۰۰ نویسه باشد.' })
  educationLevel!: string;
  @IsString({ message: 'پایه تحصیلی باید متن باشد.' })
  @Length(1, 50, { message: 'پایه تحصیلی باید بین ۱ تا ۵۰ نویسه باشد.' })
  grade!: string;
  @ValidateIf((o: SchoolInputDto) => o.educationLevel === 'متوسطه دوم')
  @IsString({ message: 'رشته تحصیلی باید متن باشد.' })
  @Length(1, 100, { message: 'رشته تحصیلی را وارد کنید.' })
  fieldOfStudy?: string;
}

export class ServiceInputDto {
  @IsIn(['BUS', 'MINIBUS', 'CAR', 'VAN'], { message: 'نوع وسیله نقلیه انتخابشده معتبر نیست.' })
  serviceType!: string;
  @IsIn(['FULL', 'INSTALLMENTS'], { message: 'روش پرداخت باید یکجا یا اقساطی باشد.' })
  paymentPlanType!: 'FULL' | 'INSTALLMENTS';
  @IsOptional()
  @IsString({ message: 'توضیحات والد باید متن باشد.' })
  @Length(1, 1000, { message: 'توضیحات والد باید حداکثر ۱۰۰۰ نویسه باشد.' })
  @Matches(persianOnly, { message: persianOnlyMessage })
  parentNotes?: string;
}

export class SignContractOnBehalfDto {
  @IsOptional()
  @IsString({ message: 'دلیل پذیرش باید متن باشد.' })
  @Length(1, 500, { message: 'دلیل پذیرش باید حداکثر ۵۰۰ نویسه باشد.' })
  reason?: string;
  @IsOptional()
  @IsString({ message: 'منبع پذیرش باید متن باشد.' })
  @Length(1, 30, { message: 'منبع پذیرش باید حداکثر ۳۰ نویسه باشد.' })
  source?: string;
}

export class CashPrepaymentDto {
  @Transform(digits)
  @IsString({ message: 'شماره رسید باید متن باشد.' })
  @Length(1, 100, { message: 'شماره رسید باید حداکثر ۱۰۰ نویسه باشد.' })
  referenceNumber!: string;
  @IsOptional()
  @Transform(digits)
  @IsDateString({ strict: true }, { message: 'تاریخ پرداخت باید معتبر باشد.' })
  paidAt?: string;
  @IsOptional()
  @IsString({ message: 'توضیحات پرداخت باید متن باشد.' })
  @Length(1, 500, { message: 'توضیحات پرداخت باید حداکثر ۵۰۰ نویسه باشد.' })
  description?: string;
}

export class AdminEnrollmentActionsDto {
  @ValidateNested()
  @IsOptional()
  @Type(() => SignContractOnBehalfDto)
  signContractOnBehalf?: SignContractOnBehalfDto;
  @ValidateNested() @IsOptional() @Type(() => CashPrepaymentDto) cashPrepayment?: CashPrepaymentDto;
}

export class GuidedEnrollmentDto {
  @IsOptional()
  @IsUUID(undefined, { message: 'شناسه عکس معتبر نیست.' })
  studentPhotoUploadId?: string;
  @ValidateNested() @Type(() => StudentInputDto) student!: StudentInputDto;
  @ValidateNested() @Type(() => GuardianInputDto) guardian!: GuardianInputDto;
  @Transform(digits)
  @Matches(/^021\d{8}$/, { message: 'شماره تلفن منزل باید شامل پیششماره ۰۲۱ و ۸ رقم باشد.' })
  homePhone!: string;
  @ValidateNested() @IsOptional() @Type(() => ParentContactInputDto) father?: ParentContactInputDto;
  @ValidateNested() @IsOptional() @Type(() => ParentContactInputDto) mother?: ParentContactInputDto;
  @ValidateNested()
  @IsOptional()
  @Type(() => EmergencyContactInputDto)
  emergencyContact?: EmergencyContactInputDto;
  @ValidateNested() @Type(() => AddressInputDto) address!: AddressInputDto;
  @ValidateNested() @Type(() => SchoolInputDto) school!: SchoolInputDto;
  @ValidateNested() @Type(() => ServiceInputDto) service!: ServiceInputDto;
  @ValidateNested()
  @IsOptional()
  @Type(() => AdminEnrollmentActionsDto)
  adminActions?: AdminEnrollmentActionsDto;
}

export class CreateRegistrationDto {
  @IsUUID(undefined, { message: 'شناسه دانشآموز معتبر نیست.' }) studentId!: string;
  @Matches(/^14\d{2}-14\d{2}$/, { message: 'سال تحصیلی باید مطابق قالب ۰۰۰۰-۱۴۰۰ باشد.' })
  academicYear!: string;
  @IsIn(['ONE_WAY', 'ROUND_TRIP'], { message: 'نوع سرویس باید رفتوبرگشتی یا یکطرفه باشد.' })
  serviceType!: string;
  @IsOptional()
  @IsDateString({ strict: true }, { message: 'تاریخ شروع باید معتبر باشد.' })
  requestedStartDate?: string;
  @IsOptional()
  @IsString({ message: 'توضیحات والد باید متن باشد.' })
  @Length(1, 1000, { message: 'توضیحات والدین باید حداکثر ۱۰۰۰ نویسه باشد.' })
  parentNotes?: string;
}

export class RejectRegistrationDto {
  @IsOptional()
  @IsString({ message: 'دلیل باید متن باشد.' })
  @Length(1, 1000, { message: 'دلیل باید حداکثر ۱۰۰۰ نویسه باشد.' })
  reason?: string;
}
export class CorrectionDto {
  @IsString({ message: 'پیام باید متن باشد.' })
  @Length(1, 1000, { message: 'پیام باید حداکثر ۱۰۰۰ نویسه باشد.' })
  message!: string;
}

export const ADMIN_ENROLLMENT_SORT_KEYS = ['studentName', 'schoolName', 'createdAt'] as const;

export class AdminEnrollmentListQueryDto {
  @IsOptional()
  @IsIn(REGISTRATION_STATUS_GROUP_VALUES, { message: 'گروه وضعیت انتخاب‌شده معتبر نیست.' })
  status = 'all';

  @IsOptional()
  @IsIn(ADMIN_ENROLLMENT_SORT_KEYS, { message: 'مرتب‌سازی انتخاب‌شده معتبر نیست.' })
  sort: (typeof ADMIN_ENROLLMENT_SORT_KEYS)[number] = 'createdAt';

  @IsOptional()
  @IsIn(['asc', 'desc'], { message: 'جهت مرتب‌سازی باید صعودی یا نزولی باشد.' })
  direction: 'asc' | 'desc' = 'desc';

  @IsOptional()
  @IsString()
  @Length(1, 100)
  q?: string;

  @Type(() => Number)
  @IsInt({ message: 'شماره صفحه باید عدد باشد.' })
  @Min(1, { message: 'شماره صفحه باید حداقل ۱ باشد.' })
  page = 1;

  @Type(() => Number)
  @IsInt({ message: 'اندازه صفحه باید عدد باشد.' })
  @Min(1, { message: 'اندازه صفحه باید حداقل ۱ باشد.' })
  @Max(500, { message: 'اندازه صفحه باید حداکثر ۵۰۰ باشد.' })
  pageSize = 20;
}
