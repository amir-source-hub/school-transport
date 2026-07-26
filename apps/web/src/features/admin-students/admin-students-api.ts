import { z } from 'zod';
import { apiRequest } from '@/lib/api-client';

const rawAdminStudentSchema = z.object({
  id: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  nationalId: z.string(),
  schoolName: z.string().nullable(),
  grade: z.string().nullable(),
  familyName: z.string(),
  userId: z.string(),
  schoolId: z.string(),
  className: z.string().nullable(),
  isActive: z.boolean(),
});

export const adminStudentSchema = rawAdminStudentSchema.extend({ status: z.string() });
export const adminStudentsSchema = z.array(rawAdminStudentSchema);

export type AdminStudent = z.infer<typeof adminStudentSchema>;

export async function getAdminStudents(): Promise<{ students: AdminStudent[] }> {
  const response = await apiRequest<unknown>('/admin/students', {
    cache: 'no-store',
    timeoutMs: 8_000,
  });
  return {
    students: adminStudentsSchema.parse(response.data).map((student) => ({
      ...student,
      status: student.isActive ? 'فعال' : 'بایگانی‌شده',
    })),
  };
}

export async function createAdminStudent(data: Record<string, string>) {
  await apiRequest('/admin/students', { method: 'POST', body: data });
}

export async function updateAdminStudent(id: string, data: Record<string, string>) {
  await apiRequest(`/admin/students/${id}`, { method: 'PATCH', body: data });
}

export async function setAdminStudentActive(id: string, active: boolean): Promise<void> {
  await apiRequest(`/admin/students/${id}/${active ? 'unarchive' : 'archive'}`, {
    method: 'POST',
    timeoutMs: 8_000,
  });
}
