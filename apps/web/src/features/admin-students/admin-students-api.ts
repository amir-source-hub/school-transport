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

export async function setAdminStudentActive(
  id: string,
  active: boolean,
  reason?: string,
): Promise<void> {
  await apiRequest(`/admin/students/${id}/${active ? 'unarchive' : 'archive'}`, {
    method: 'POST',
    body: reason ? { reason } : undefined,
    timeoutMs: 8_000,
  });
}

export const adminLimitRequestSchema = z.object({
  id: z.string(),
  userId: z.string(),
  username: z.string(),
  familyName: z.string(),
  currentLimit: z.number(),
  requestedLimit: z.number(),
  reason: z.string(),
  status: z.string(),
  reviewedByAdminId: z.string().nullable(),
  reviewedAt: z.string().nullable(),
  rejectionReason: z.string().nullable(),
  createdAt: z.string(),
});

export type AdminLimitRequest = z.infer<typeof adminLimitRequestSchema>;

export async function getAdminLimitRequests(): Promise<AdminLimitRequest[]> {
  const response = await apiRequest<unknown>('/admin/students/limit-requests', {
    cache: 'no-store',
    timeoutMs: 8_000,
  });
  return z.array(adminLimitRequestSchema).parse(response.data);
}

export async function approveAdminLimitRequest(requestId: string) {
  await apiRequest(`/admin/students/limit-requests/${requestId}/approve`, {
    method: 'POST',
    timeoutMs: 8_000,
  });
}

export async function rejectAdminLimitRequest(requestId: string, reason?: string) {
  await apiRequest(`/admin/students/limit-requests/${requestId}/reject`, {
    method: 'POST',
    body: { reason },
    timeoutMs: 8_000,
  });
}
