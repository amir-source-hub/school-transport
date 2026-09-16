import { z } from 'zod';
import { isValidIranianNationalId, normalizeDigits } from '@/features/enrollment/national-id';

const required = 'پر کردن این فیلد اجباری است';
const text = z.string().trim().min(1, required);
const persianText = z
  .string()
  .trim()
  .min(1, required)
  .regex(/^[\u0600-\u06FF\u200c\s\d۰-۹٠-٩،؛,.()\-/]+$/, 'فقط حروف فارسی و عدد مجاز است.');
const optionalPersianName = z
  .string()
  .trim()
  .refine(
    (value) => !value || /^[\u0600-\u06FF\u200c\s-]+$/.test(value),
    'فقط حروف فارسی مجاز است.',
  );
const mobile = z
  .string()
  .transform(normalizeDigits)
  .pipe(z.string().regex(/^09\d{9}$/, 'شماره همراه باید با ۰۹ شروع شود و ۱۱ رقم باشد.'));
const optionalMobile = z
  .string()
  .transform(normalizeDigits)
  .refine(
    (value) => !value || value === '09' || /^09\d{9}$/.test(value),
    'شماره همراه باید با ۰۹ شروع شود و ۱۱ رقم باشد.',
  );
const futureDate = z
  .string()
  .min(1, required)
  .refine(
    (value) => value >= new Date().toISOString().slice(0, 10),
    'تاریخ انقضا نمی‌تواند گذشته باشد.',
  );
export const plateLetters = [
  'ب',
  'ت',
  'ج',
  'چ',
  'ح',
  'خ',
  'د',
  'ذ',
  'ر',
  'ز',
  'ژ',
  'س',
  'ص',
  'ض',
  'ط',
  'ظ',
  'ع',
  'غ',
  'ف',
  'ق',
  'ک',
  'گ',
  'ل',
  'م',
  'ن',
  'و',
  'ه',
  'ی',
] as const;

export function removeLatinLetters(value: string) {
  return value.replace(/[A-Za-z]/g, '');
}

export function hasReachedContractEnd(
  scrollHeight: number,
  clientHeight: number,
  scrollTop: number,
) {
  return scrollHeight <= clientHeight + 2 || scrollTop + clientHeight >= scrollHeight - 8;
}

export const driverEnrollmentSchema = z
  .object({
    firstName: persianText,
    lastName: persianText,
    fatherName: persianText,
    gender: z.enum(['MALE', 'FEMALE'], { message: required }),
    nationalId: z
      .string()
      .transform(normalizeDigits)
      .refine(isValidIranianNationalId, 'کد ملی باید دقیقاً ۱۰ رقم باشد.'),
    phoneNumber: mobile,
    secondaryPhoneNumber: optionalMobile,
    education: z.enum(
      ['BELOW_DIPLOMA', 'DIPLOMA', 'ASSOCIATE', 'BACHELOR', 'MASTER', 'DOCTORATE'],
      { message: required },
    ),
    homePhoneNumber: z
      .string()
      .transform(normalizeDigits)
      .pipe(z.string().regex(/^\d{11}$/, 'تلفن ثابت باید همراه پیش‌شماره و دقیقاً ۱۱ رقم باشد.')),
    iban: z
      .string()
      .transform(normalizeDigits)
      .pipe(
        z.string().regex(/^IR\d{24}$/, 'شماره شبا باید با IR شروع شود و دقیقاً ۲۴ رقم داشته باشد.'),
      ),
    cardNumber: z
      .string()
      .transform(normalizeDigits)
      .pipe(z.string().regex(/^\d{16}$/, 'شماره کارت باید دقیقاً ۱۶ رقم داشته باشد.')),
    bankName: persianText,
    emergencyFirstName: persianText,
    emergencyLastName: persianText,
    emergencyRelationship: persianText,
    emergencyPhoneNumber: mobile,
    driverPhotoUploadId: z.string().uuid('بارگذاری عکس راننده الزامی است.'),
    streetAddress: persianText.refine((value) => value.length >= 5, 'آدرس کامل را وارد کنید.'),
    postalCode: z
      .string()
      .transform(normalizeDigits)
      .pipe(z.string().regex(/^\d{10}$/, 'کد پستی باید ۱۰ رقم باشد.')),
    province: persianText,
    city: persianText,
    municipalityDistrict: text,
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    locationSelected: z.boolean().refine(Boolean, 'انتخاب موقعیت مکانی الزامی است.'),
    referrerName: optionalPersianName,
    referrerPhoneNumber: optionalMobile,
    vehiclePhotoUploadId: z.string().uuid('بارگذاری عکس خودرو الزامی است.'),
    insuranceExpiresAt: futureDate,
    vehicleType: z.enum(['CAR', 'VAN', 'MINIBUS', 'BUS'], { message: required }),
    system: persianText,
    modelYear: z.coerce
      .number()
      .int()
      .min(1300, 'سال ساخت معتبر نیست.')
      .max(1500, 'سال ساخت معتبر نیست.'),
    plateLeft: z
      .string()
      .transform(normalizeDigits)
      .pipe(z.string().regex(/^\d{2}$/, 'دو رقم وارد کنید.')),
    plateLetter: z.enum(plateLetters, { message: required }),
    plateMiddle: z
      .string()
      .transform(normalizeDigits)
      .pipe(z.string().regex(/^\d{3}$/, 'سه رقم وارد کنید.')),
    plateIran: z
      .string()
      .transform(normalizeDigits)
      .pipe(z.string().regex(/^\d{2}$/, 'دو رقم وارد کنید.')),
    technicalInspectionExpiresAt: futureDate,
    usageType: z.enum(['PERSONAL', 'TAXI']),
    ownershipType: z.enum(['SELF', 'OTHER']),
    contractFullyRead: z.boolean().refine(Boolean, 'قرارداد را تا انتها مطالعه کنید.'),
    contractAccepted: z.boolean().refine(Boolean, 'پذیرش قرارداد الزامی است.'),
  })
  .superRefine((values, context) => {
    const phones = [
      ['phoneNumber', values.phoneNumber],
      [
        'secondaryPhoneNumber',
        values.secondaryPhoneNumber === '09' ? '' : values.secondaryPhoneNumber,
      ],
      ['emergencyPhoneNumber', values.emergencyPhoneNumber],
      ['homePhoneNumber', values.homePhoneNumber],
    ] as const;
    const seen = new Set<string>();
    for (const [field, rawValue] of phones) {
      if (!rawValue) continue;
      const value = normalizeDigits(rawValue);
      if (seen.has(value)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: [field],
          message: 'هر شماره تماس باید منحصربه‌فرد باشد.',
        });
      }
      seen.add(value);
    }
  });

export type DriverEnrollmentForm = z.input<typeof driverEnrollmentSchema>;
export const stepFields: (keyof DriverEnrollmentForm)[][] = [
  [
    'firstName',
    'lastName',
    'fatherName',
    'gender',
    'nationalId',
    'phoneNumber',
    'secondaryPhoneNumber',
    'education',
    'homePhoneNumber',
    'emergencyFirstName',
    'emergencyLastName',
    'emergencyRelationship',
    'emergencyPhoneNumber',
    'driverPhotoUploadId',
    'iban',
    'cardNumber',
    'bankName',
  ],
  [
    'streetAddress',
    'postalCode',
    'province',
    'city',
    'municipalityDistrict',
    'latitude',
    'longitude',
    'locationSelected',
    'referrerName',
    'referrerPhoneNumber',
  ],
  [
    'vehiclePhotoUploadId',
    'insuranceExpiresAt',
    'vehicleType',
    'system',
    'modelYear',
    'technicalInspectionExpiresAt',
    'plateLeft',
    'plateLetter',
    'plateMiddle',
    'plateIran',
    'usageType',
    'ownershipType',
  ],
  ['contractFullyRead', 'contractAccepted'],
];
