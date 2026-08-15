import { z } from 'zod';
import {
  composeMobileNumber,
  normalizeNationalId,
  normalizePhoneNumber,
} from './input-normalizers';
import { isAllowedPersianText, persianTextMessage } from './persian-text';
import { isValidIranianNationalId, nationalIdError } from './national-id';

const required = 'پر کردن این فیلد اجباری است';

const name = z
  .string()
  .trim()
  .min(1, required)
  .max(100, 'حداکثر ۱۰۰ نویسه مجاز است.')
  .superRefine((value, ctx) => {
    if (!value || isAllowedPersianText(value)) return;
    ctx.addIssue({ code: 'custom', message: persianTextMessage(value) });
  });

const nationalId = z
  .string()
  .transform(normalizeNationalId)
  .refine(isValidIranianNationalId, { message: nationalIdError });

const mobile = z
  .string()
  .transform(normalizePhoneNumber)
  .refine((value) => composeMobileNumber(value).length === 11, {
    message: 'شماره همراه باید با ۰۹ شروع شود و ۱۱ رقم باشد.',
  });

const homePhone = z
  .string()
  .transform(normalizePhoneNumber)
  .refine((value) => /^021\d{8}$/.test(value), {
    message: 'شماره تلفن منزل باید شامل پیششماره ۰۲۱ و ۸ رقم باشد.',
  });

export const studentSchema = z.object({
  id: z.string().uuid().optional(),
  firstName: name,
  lastName: name,
  fatherName: name,
  nationalId,
  birthDate: z
    .string()
    .date('تاریخ تولد معتبر نیست.')
    .refine((value) => value <= new Date().toISOString().slice(0, 10), {
      message: 'تاریخ تولد نمی‌تواند در آینده باشد.',
    })
    .refine((value) => value >= '1900-01-01', {
      message: 'تاریخ تولد از بازه مجاز قدیمی‌تر است.',
    })
    .optional(),
  gender: z.enum(['MALE', 'FEMALE'], { message: 'انتخاب جنسیت اجباری است.' }),
  phoneNumber: mobile.optional(),
});

export const parentContactSchema = z.object({
  firstName: name,
  lastName: name,
  nationalId,
  phoneNumber: mobile,
});

export const guardianSchema = z
  .object({
    firstName: name,
    lastName: name,
    nationalId,
    relationshipType: z.enum(['FATHER', 'MOTHER', 'OTHER'], {
      message: 'نسبت باید پدر، مادر یا سایر باشد.',
    }),
    relationshipDescription: z.string().trim().max(100, 'حداکثر ۱۰۰ نویسه مجاز است.').optional(),
  })
  .superRefine((value, ctx) => {
    if (value.relationshipType === 'OTHER' && !value.relationshipDescription?.trim()) {
      ctx.addIssue({
        code: 'custom',
        path: ['relationshipDescription'],
        message: 'شرح نسبت را وارد کنید.',
      });
    }
  });

export const emergencyContactSchema = z.object({
  firstName: name,
  lastName: name,
  relationship: z
    .string()
    .trim()
    .min(1, required)
    .max(50, 'حداکثر ۵۰ نویسه مجاز است.')
    .superRefine((value, ctx) => {
      if (!value || isAllowedPersianText(value)) return;
      ctx.addIssue({ code: 'custom', message: persianTextMessage(value) });
    }),
  phoneNumber: mobile,
});

export const addressSchema = z.object({
  title: z.string().trim().min(1, required).max(100, 'حداکثر ۱۰۰ نویسه مجاز است.'),
  province: z.string().trim().min(1, required).max(100, 'حداکثر ۱۰۰ نویسه مجاز است.'),
  city: z.string().trim().min(1, required).max(100, 'حداکثر ۱۰۰ نویسه مجاز است.'),
  streetAddress: z.string().trim().min(1, required).max(500, 'حداکثر ۵۰۰ نویسه مجاز است.'),
  postalCode: z
    .string()
    .transform(normalizeNationalId)
    .refine((value) => /^\d{10}$/.test(value), { message: 'کد پستی باید ۱۰ رقم باشد.' }),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

export const schoolSchema = z
  .object({
    schoolId: z.string().uuid('مدرسه انتخاب‌شده معتبر نیست.'),
    educationLevel: z.string().min(1, required),
    grade: z.string().min(1, required),
    fieldOfStudy: z.string().trim().max(100, 'حداکثر ۱۰۰ نویسه مجاز است.').optional(),
  })
  .superRefine((value, ctx) => {
    if (value.educationLevel === 'متوسطه دوم' && !value.fieldOfStudy) {
      ctx.addIssue({
        code: 'custom',
        path: ['fieldOfStudy'],
        message: 'رشته تحصیلی را وارد کنید.',
      });
    }
  });

export const serviceSchema = z.object({
  serviceType: z.enum(['BUS', 'MINIBUS', 'CAR', 'VAN']),
  paymentPlanType: z.enum(['FULL', 'INSTALLMENTS']),
  parentNotes: z.string().max(1000, 'حداکثر ۱۰۰۰ نویسه مجاز است.').optional(),
});

export const guidedEnrollmentSchema = z.object({
  studentPhotoUploadId: z.string().uuid().optional(),
  student: studentSchema,
  guardian: guardianSchema,
  father: parentContactSchema.nullable().optional(),
  mother: parentContactSchema.nullable().optional(),
  emergencyContact: emergencyContactSchema.nullable().optional(),
  homePhone,
  address: addressSchema,
  school: schoolSchema,
  service: serviceSchema,
});

export type GuidedEnrollmentInput = z.infer<typeof guidedEnrollmentSchema>;
export type StudentInput = z.infer<typeof studentSchema>;
export type GuardianInput = z.infer<typeof guardianSchema>;
export type ParentContactInput = z.infer<typeof parentContactSchema>;
export type EmergencyContactInput = z.infer<typeof emergencyContactSchema>;
export type AddressInput = z.infer<typeof addressSchema>;
export type ServiceInput = z.infer<typeof serviceSchema>;
