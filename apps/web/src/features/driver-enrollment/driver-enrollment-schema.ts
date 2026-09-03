import { z } from 'zod';
import { isValidIranianNationalId, normalizeDigits } from '@/features/enrollment/national-id';

const required = 'پر کردن این فیلد اجباری است';
const text = z.string().trim().min(1, required);
const persianText = z.string().trim().min(1, required).regex(/^[\u0600-\u06FF\u200c\s\d۰-۹٠-٩،؛,.()\-/]+$/, 'فقط حروف فارسی و عدد مجاز است.');
const optionalPersianText = z.string().trim().refine((value) => !value || /^[\u0600-\u06FF\u200c\s\d۰-۹٠-٩،؛,.()\-/]+$/.test(value), 'فقط حروف فارسی و عدد مجاز است.');
const mobile = z.string().transform(normalizeDigits).pipe(z.string().regex(/^09\d{9}$/, 'شماره همراه باید با ۰۹ شروع شود و ۱۱ رقم باشد.'));
const optionalMobile = z.string().transform(normalizeDigits).refine((value) => !value || value === '09' || /^09\d{9}$/.test(value), 'شماره همراه باید با ۰۹ شروع شود و ۱۱ رقم باشد.');
const futureDate = z.string().min(1, required).refine((value) => value >= new Date().toISOString().slice(0, 10), 'تاریخ انقضا نمی‌تواند گذشته باشد.');
export const plateLetters = ['ب', 'ج', 'د', 'ز', 'ط', 'ظ', 'ع', 'ف', 'ق', 'ک', 'ل', 'م', 'ن', 'و', 'ه', 'ی'] as const;

export function removeLatinLetters(value: string) {
  return value.replace(/[A-Za-z]/g, '');
}

export function hasReachedContractEnd(scrollHeight: number, clientHeight: number, scrollTop: number) {
  return scrollHeight <= clientHeight + 2 || scrollTop + clientHeight >= scrollHeight - 8;
}

export const driverEnrollmentSchema = z.object({
  firstName: persianText, lastName: persianText, fatherName: persianText,
  gender: z.enum(['MALE', 'FEMALE'], { message: required }),
  nationalId: z.string().transform(normalizeDigits).refine(isValidIranianNationalId, 'کد ملی باید دقیقاً ۱۰ رقم باشد.'),
  phoneNumber: mobile,
  secondaryPhoneNumber: optionalMobile,
  education: z.enum(['BELOW_DIPLOMA', 'DIPLOMA', 'ASSOCIATE', 'BACHELOR', 'MASTER', 'DOCTORATE'], { message: required }),
  homePhoneNumber: z.string().transform(normalizeDigits).refine((value) => !value || /^\d{8}$/.test(value), 'تلفن منزل باید دقیقاً ۸ رقم باشد.'),
  emergencyPhoneNumber: mobile,
  licenseExpiresAt: futureDate,
  driverPhotoUploadId: z.string().uuid('بارگذاری عکس راننده الزامی است.'),
  streetAddress: persianText.refine((value) => value.length >= 5, 'آدرس کامل را وارد کنید.'),
  postalCode: z.string().transform(normalizeDigits).pipe(z.string().regex(/^\d{10}$/, 'کد پستی باید ۱۰ رقم باشد.')),
  province: persianText, city: persianText, municipalityDistrict: text,
  latitude: z.number().min(-90).max(90), longitude: z.number().min(-180).max(180),
  locationSelected: z.boolean().refine(Boolean, 'انتخاب موقعیت مکانی الزامی است.'),
  referrerName: optionalPersianText, referrerPhoneNumber: optionalMobile,
  vehiclePhotoUploadId: z.string().uuid('بارگذاری عکس خودرو الزامی است.'),
  insuranceExpiresAt: futureDate,
  vehicleType: z.enum(['CAR', 'VAN', 'MINIBUS', 'BUS'], { message: required }),
  system: persianText,
  modelYear: z.coerce.number().int().min(1300, 'سال ساخت معتبر نیست.').max(1500, 'سال ساخت معتبر نیست.'),
  plateLeft: z.string().transform(normalizeDigits).pipe(z.string().regex(/^\d{2}$/, 'دو رقم وارد کنید.')),
  plateLetter: z.enum(plateLetters, { message: required }),
  plateMiddle: z.string().transform(normalizeDigits).pipe(z.string().regex(/^\d{3}$/, 'سه رقم وارد کنید.')),
  plateIran: z.string().transform(normalizeDigits).pipe(z.string().regex(/^\d{2}$/, 'دو رقم وارد کنید.')),
  technicalInspectionExpiresAt: futureDate,
  usageType: z.enum(['PERSONAL', 'TAXI']), ownershipType: z.enum(['SELF', 'OTHER']),
  contractFullyRead: z.boolean().refine(Boolean, 'قرارداد را تا انتها مطالعه کنید.'),
  contractAccepted: z.boolean().refine(Boolean, 'پذیرش قرارداد الزامی است.'),
}).superRefine((values, context) => {
  if (values.secondaryPhoneNumber && values.secondaryPhoneNumber !== '09' && values.secondaryPhoneNumber === values.phoneNumber) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['secondaryPhoneNumber'], message: 'شماره همراه دوم نباید با شماره همراه اول یکسان باشد.' });
  }
  if (values.emergencyPhoneNumber === values.phoneNumber) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['emergencyPhoneNumber'], message: 'شماره تماس اضطراری نباید با شماره همراه اول یکسان باشد.' });
  }
});

export type DriverEnrollmentForm = z.input<typeof driverEnrollmentSchema>;
export const stepFields: (keyof DriverEnrollmentForm)[][] = [
  ['firstName','lastName','fatherName','gender','nationalId','phoneNumber','secondaryPhoneNumber','education','homePhoneNumber','emergencyPhoneNumber','licenseExpiresAt','driverPhotoUploadId'],
  ['streetAddress','postalCode','province','city','municipalityDistrict','latitude','longitude','locationSelected','referrerName','referrerPhoneNumber'],
  ['vehiclePhotoUploadId','insuranceExpiresAt','vehicleType','system','modelYear','technicalInspectionExpiresAt','plateLeft','plateLetter','plateMiddle','plateIran','usageType','ownershipType'],
  ['contractFullyRead','contractAccepted'],
];
