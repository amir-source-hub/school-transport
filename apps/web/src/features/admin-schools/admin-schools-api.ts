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
  educationOptions: z.array(z.object({
    level: z.string(),
    grades: z.array(z.string()),
  })),
  isActive: z.boolean(),
});

export const schoolSchema = rawSchoolSchema.extend({ status: z.string() });
export const schoolsSchema = z.array(schoolSchema);
export const createSchoolSchema = z.object({
  name: z.string().min(1, 'نام مدرسه الزامی است'),
  schoolType: z.string().min(1, 'نوع مدرسه الزامی است'),
  genderType: z.string().min(1, 'نوع جنسیت الزامی است'),
  province: z.string().min(1, 'استان الزامی است'),
  city: z.string().min(1, 'شهر الزامی است'),
  district: z.string().optional(),
  address: z.string().min(1, 'نشانی الزامی است'),
  phoneNumber: z.string().optional(),
  educationOptions: z.array(z.object({
    level: z.string().min(1),
    grades: z.array(z.string().min(1)).min(1),
  })).min(1, 'حداقل یک مقطع و پایه انتخاب کنید'),
});

export type AdminSchool = z.infer<typeof schoolSchema>;
export type CreateSchoolInput = z.infer<typeof createSchoolSchema>;

const mapSchool = (value: unknown): AdminSchool => {
  const school = rawSchoolSchema.parse(value);
  return { ...school, status: school.isActive ? 'فعال' : 'غیرفعال' };
};

export async function getAdminSchools() {
  const response = await apiRequest<unknown>('/admin/schools', { cache: 'no-store', timeoutMs: 8_000 });
  return { schools: z.array(rawSchoolSchema).parse(response.data).map((school) => mapSchool(school)) };
}

export async function createSchool(data: CreateSchoolInput) {
  const response = await apiRequest<unknown>('/admin/schools', { method: 'POST', body: data });
  return mapSchool(response.data);
}

export async function updateSchool(id: string, data: Partial<CreateSchoolInput>) {
  const response = await apiRequest<unknown>(`/admin/schools/${id}`, { method: 'PATCH', body: data });
  return mapSchool(response.data);
}

export async function archiveSchool(id: string) {
  await apiRequest(`/admin/schools/${id}/archive`, { method: 'POST' });
}

export async function unarchiveSchool(id: string) {
  await apiRequest(`/admin/schools/${id}/unarchive`, { method: 'POST' });
}
