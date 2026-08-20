import { z } from 'zod';
import { apiRequest } from '@/lib/api-client';

const rawSchoolSchema = z.object({
  id: z.string(),
  name: z.string(),
  schoolType: z.string(),
  genderType: z.string(),
  province: z.string(),
  city: z.string(),
  district: z.string().nullable(),
  address: z.string(),
  phoneNumber: z.string().nullable(),
  managerName: z.string().nullable(),
  managerPhone: z.string().nullable(),
  openingTime: z.string(),
  closingTime: z.string(),
  closingTimes: z.array(z.string()).default([]),
  latitude: z.number().nullable(),
  longitude: z.number().nullable(),
  educationOptions: z.array(
    z.object({
      level: z.string(),
      grades: z.array(z.string()),
    }),
  ),
  isActive: z.boolean(),
});

export const SCHOOL_TYPE_LABELS: Record<string, string> = {
  PUBLIC: 'دولتی',
  PRIVATE: 'غیرانتفاعی',
  BOARD_OF_TRUSTEES: 'هیئت امنایی',
  NEMOONE_DOLATI: 'نمونه دولتی',
  GIFTED: 'تیزهوشان',
  SHAHED: 'شاهد',
  BOARDING: 'شبانه‌روزی',
  SPECIAL: 'استثنائی',
  INTERNATIONAL: 'بین‌المللی',
};

export const GENDER_TYPE_LABELS: Record<string, string> = {
  MALE: 'پسرانه',
  FEMALE: 'دخترانه',
  MIXED: 'مختلط',
};

export const schoolSchema = rawSchoolSchema.extend({ status: z.string() });
export const schoolsSchema = z.array(schoolSchema);
const schoolTimeSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'همه ساعت‌های پایان مدرسه را وارد کنید');

export const createSchoolSchema = z.object({
  name: z.string().min(1, 'نام مدرسه الزامی است'),
  schoolType: z.string().min(1, 'نوع مدرسه الزامی است'),
  genderType: z.string().min(1, 'نوع جنسیت الزامی است'),
  province: z.string().min(1, 'استان الزامی است'),
  city: z.string().min(1, 'شهر الزامی است'),
  district: z.string().optional(),
  address: z.string().min(1, 'نشانی الزامی است'),
  phoneNumber: z
    .string()
    .regex(/^0[1-8]\d{9}$/, 'شماره تلفن مدرسه باید ۱۱ رقم و با پیش‌شماره معتبر باشد'),
  managerName: z.string().trim().min(1, 'نام مدیر الزامی است'),
  managerPhone: z.string().regex(/^09\d{9}$/, 'شماره همراه مدیر باید ۱۱ رقم و با ۰۹ شروع شود'),
  openingTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'ساعت شروع مدرسه الزامی است'),
  closingTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'ساعت پایان مدرسه الزامی است'),
  closingTimes: z.array(schoolTimeSchema).min(1, 'حداقل یک ساعت پایان مدرسه وارد کنید'),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  educationOptions: z
    .array(
      z.object({
        level: z.string().min(1),
        grades: z.array(z.string().min(1)).min(1),
      }),
    )
    .min(1, 'حداقل یک مقطع و پایه انتخاب کنید'),
});

export type AdminSchool = z.infer<typeof schoolSchema>;
export type CreateSchoolInput = z.infer<typeof createSchoolSchema>;

const mapSchool = (value: unknown): AdminSchool => {
  const school = rawSchoolSchema.parse(value);
  return { ...school, status: school.isActive ? 'فعال' : 'غیرفعال' };
};

export async function getAdminSchools() {
  const response = await apiRequest<unknown>('/admin/schools', {
    cache: 'no-store',
    timeoutMs: 8_000,
  });
  return {
    schools: z
      .array(rawSchoolSchema)
      .parse(response.data)
      .map((school) => mapSchool(school)),
  };
}

export async function createSchool(data: CreateSchoolInput) {
  const response = await apiRequest<unknown>('/admin/schools', { method: 'POST', body: data });
  return mapSchool(response.data);
}

export async function provisionSchoolManager(data: {
  username: string;
  password: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  schoolId: string;
}) {
  await apiRequest('/admin/admins/school-managers', { method: 'POST', body: data });
}

export async function updateSchool(id: string, data: Partial<CreateSchoolInput>) {
  const response = await apiRequest<unknown>(`/admin/schools/${id}`, {
    method: 'PATCH',
    body: data,
  });
  return mapSchool(response.data);
}

export async function archiveSchool(id: string) {
  await apiRequest(`/admin/schools/${id}/archive`, { method: 'POST' });
}

export async function unarchiveSchool(id: string) {
  await apiRequest(`/admin/schools/${id}/unarchive`, { method: 'POST' });
}
