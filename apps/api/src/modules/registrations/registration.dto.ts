import { Transform, Type } from 'class-transformer';
import { IsDateString, IsIn, IsNumber, IsOptional, IsString, IsUUID, Length, Matches, Max, Min, ValidateIf, ValidateNested } from 'class-validator';
import { normalizeIranianDigits } from '../../common/iranian-national-id';

const digits = ({ value }: { value: unknown }) => typeof value === 'string' ? normalizeIranianDigits(value).trim() : value;

class IdentityInputDto {
  @IsString({ message: 'نام باید متن باشد.' }) @Length(1, 100, { message: 'نام باید بین ۱ تا ۱۰۰ نویسه باشد.' }) firstName!: string;
  @IsString({ message: 'نام خانوادگی باید متن باشد.' }) @Length(1, 100, { message: 'نام خانوادگی باید بین ۱ تا ۱۰۰ نویسه باشد.' }) lastName!: string;
  @Transform(digits) @Matches(/^\d{10}$/, { message: 'کد ملی باید ۱۰ رقم باشد.' }) nationalId!: string;
}

export class StudentInputDto extends IdentityInputDto {
  @IsOptional() @IsUUID(undefined, { message: 'شناسه دانشآموز معتبر نیست.' }) id?: string;
  @IsOptional() @Transform(digits) @IsDateString({ strict: true }, { message: 'تاریخ تولد باید معتبر باشد.' }) birthDate?: string;
  @IsOptional() @IsIn(['MALE', 'FEMALE'], { message: 'جنسیت باید پسر یا دختر باشد.' }) gender?: string;
}

export class ParentContactInputDto extends IdentityInputDto {
  @Transform(digits) @Matches(/^09\d{9}$/, { message: 'شماره همراه باید با ۰۹ شروع شود و ۱۱ رقم باشد.' }) phoneNumber!: string;
}

export class GuardianInputDto extends IdentityInputDto {
  @IsIn(['FATHER', 'MOTHER', 'OTHER'], { message: 'نسبت باید پدر، مادر یا سایر باشد.' }) relationshipType!: 'FATHER' | 'MOTHER' | 'OTHER';
  @ValidateIf((o: GuardianInputDto) => o.relationshipType === 'OTHER')
  @IsString({ message: 'شرح نسبت را وارد کنید.' })
  @Length(1, 100, { message: 'شرح نسبت باید بین ۱ تا ۱۰۰ نویسه باشد.' })
  relationshipDescription?: string;
}

export class EmergencyContactInputDto {
  @IsString({ message: 'نام باید متن باشد.' }) @Length(1, 100, { message: 'نام باید بین ۱ تا ۱۰۰ نویسه باشد.' }) firstName!: string;
  @IsString({ message: 'نام خانوادگی باید متن باشد.' }) @Length(1, 100, { message: 'نام خانوادگی باید بین ۱ تا ۱۰۰ نویسه باشد.' }) lastName!: string;
  @IsString({ message: 'نسبت باید متن باشد.' }) @Length(1, 50, { message: 'نسبت باید بین ۱ تا ۵۰ نویسه باشد.' }) relationship!: string;
  @Transform(digits) @Matches(/^09\d{9}$/, { message: 'شماره همراه باید با ۰۹ شروع شود و ۱۱ رقم باشد.' }) phoneNumber!: string;
}

export class AddressInputDto {
  @IsString({ message: 'عنوان نشانی باید متن باشد.' }) @Length(1, 100, { message: 'عنوان نشانی باید بین ۱ تا ۱۰۰ نویسه باشد.' }) title!: string;
  @IsString({ message: 'استان باید متن باشد.' }) @Length(1, 100, { message: 'استان باید بین ۱ تا ۱۰۰ نویسه باشد.' }) province!: string;
  @IsString({ message: 'شهر باید متن باشد.' }) @Length(1, 100, { message: 'شهر باید بین ۱ تا ۱۰۰ نویسه باشد.' }) city!: string;
  @IsOptional() @IsString({ message: 'منطقه باید متن باشد.' }) @Length(1, 50, { message: 'منطقه باید بین ۱ تا ۵۰ نویسه باشد.' }) district?: string;
  @IsString({ message: 'نشانی کامل باید متن باشد.' }) @Length(1, 500, { message: 'نشانی کامل باید بین ۱ تا ۵۰۰ نویسه باشد.' }) streetAddress!: string;
  @Transform(digits) @Matches(/^\d{10}$/, { message: 'کد پستی باید ۱۰ رقم باشد.' }) postalCode!: string;
  @Type(() => Number) @IsNumber(undefined, { message: 'عرض جغرافیایی باید عدد باشد.' }) @Min(-90, { message: 'عرض جغرافیایی باید بین ۹۰- و ۹۰ باشد.' }) @Max(90, { message: 'عرض جغرافیایی باید بین ۹۰- و ۹۰ باشد.' }) latitude!: number;
  @Type(() => Number) @IsNumber(undefined, { message: 'طول جغرافیایی باید عدد باشد.' }) @Min(-180, { message: 'طول جغرافیایی باید بین ۱۸۰- و ۱۸۰ باشد.' }) @Max(180, { message: 'طول جغرافیایی باید بین ۱۸۰- و ۱۸۰ باشد.' }) longitude!: number;
}

export class SchoolInputDto {
  @IsUUID(undefined, { message: 'شناسه مدرسه معتبر نیست.' }) schoolId!: string;
  @IsString({ message: 'مقطع تحصیلی باید متن باشد.' }) @Length(1, 100, { message: 'مقطع تحصیلی باید بین ۱ تا ۱۰۰ نویسه باشد.' }) educationLevel!: string;
  @IsString({ message: 'پایه تحصیلی باید متن باشد.' }) @Length(1, 50, { message: 'پایه تحصیلی باید بین ۱ تا ۵۰ نویسه باشد.' }) grade!: string;
}

export class ServiceInputDto {
  @IsIn(['BUS', 'MINIBUS', 'CAR', 'VAN'], { message: 'نوع وسیله نقلیه انتخابشده معتبر نیست.' }) serviceType!: string;
  @IsIn(['FULL', 'INSTALLMENTS'], { message: 'روش پرداخت باید یکجا یا اقساطی باشد.' }) paymentPlanType!: 'FULL' | 'INSTALLMENTS';
  @IsOptional() @IsString({ message: 'توضیحات والد باید متن باشد.' }) @Length(1, 1000, { message: 'توضیحات والد باید حداکثر ۱۰۰۰ نویسه باشد.' }) parentNotes?: string;
}

export class GuidedEnrollmentDto {
  @ValidateNested() @Type(() => StudentInputDto) student!: StudentInputDto;
  @ValidateNested() @Type(() => GuardianInputDto) guardian!: GuardianInputDto;
  @ValidateNested() @IsOptional() @Type(() => ParentContactInputDto) father?: ParentContactInputDto;
  @ValidateNested() @IsOptional() @Type(() => ParentContactInputDto) mother?: ParentContactInputDto;
  @ValidateNested() @IsOptional() @Type(() => EmergencyContactInputDto) emergencyContact?: EmergencyContactInputDto;
  @ValidateNested() @Type(() => AddressInputDto) address!: AddressInputDto;
  @ValidateNested() @Type(() => SchoolInputDto) school!: SchoolInputDto;
  @ValidateNested() @Type(() => ServiceInputDto) service!: ServiceInputDto;
}

export class CreateRegistrationDto {
  @IsUUID(undefined, { message: 'شناسه دانشآموز معتبر نیست.' }) studentId!: string;
  @Matches(/^14\d{2}-14\d{2}$/, { message: 'سال تحصیلی باید مطابق قالب ۰۰۰۰-۱۴۰۰ باشد.' }) academicYear!: string;
  @IsIn(['ONE_WAY', 'ROUND_TRIP'], { message: 'نوع سرویس باید رفتوبرگشتی یا یکطرفه باشد.' }) serviceType!: string;
  @IsOptional() @IsDateString({ strict: true }, { message: 'تاریخ شروع باید معتبر باشد.' }) requestedStartDate?: string;
  @IsOptional() @IsString({ message: 'توضیحات والد باید متن باشد.' }) @Length(1, 1000, { message: 'توضیحات والدین باید حداکثر ۱۰۰۰ نویسه باشد.' }) parentNotes?: string;
}

export class RejectRegistrationDto { @IsOptional() @IsString({ message: 'دلیل باید متن باشد.' }) @Length(1, 1000, { message: 'دلیل باید حداکثر ۱۰۰۰ نویسه باشد.' }) reason?: string; }
export class CorrectionDto { @IsString({ message: 'پیام باید متن باشد.' }) @Length(1, 1000, { message: 'پیام باید حداکثر ۱۰۰۰ نویسه باشد.' }) message!: string; }