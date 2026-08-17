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
  studentCode: z.string().nullable().optional(),
  fatherName: z.string().nullable().optional(),
  phoneNumber: z.string().nullable().optional(),
  fieldOfStudy: z.string().nullable().optional(),
  isActive: z.boolean(),
});

export const adminStudentSchema = rawAdminStudentSchema.extend({ status: z.string() });
export const adminStudentsSchema = z.array(rawAdminStudentSchema);

export type AdminStudent = z.infer<typeof adminStudentSchema>;

export type AdminStudentListParams = {
  archive?: 'all' | 'active' | 'archived';
  sort?: 'studentName' | 'schoolName' | 'createdAt';
  direction?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
};

export type AdminStudentListPagination = {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
};

export async function getAdminStudents(
  params: AdminStudentListParams = {},
): Promise<{ students: AdminStudent[]; pagination: AdminStudentListPagination }> {
  const search = new URLSearchParams();
  if (params.archive && params.archive !== 'all') search.set('archive', params.archive);
  if (params.sort && params.sort !== 'createdAt') search.set('sort', params.sort);
  if (params.direction && params.direction !== 'desc') search.set('direction', params.direction);
  if (params.page && params.page > 1) search.set('page', String(params.page));
  if (params.pageSize) search.set('pageSize', String(params.pageSize));
  const qs = search.toString();
  const response = await apiRequest<unknown>(`/admin/students${qs ? `?${qs}` : ''}`, {
    cache: 'no-store',
    timeoutMs: 8_000,
  });
  return {
    students: adminStudentsSchema.parse(response.data).map((student) => ({
      ...student,
      status: student.isActive ? 'فعال' : 'بایگانی‌شده',
    })),
    pagination: response.pagination ?? { page: 1, pageSize: 20, totalItems: 0, totalPages: 1 },
  };
}

export async function createAdminStudent(data: Record<string, string>) {
  await apiRequest('/admin/students', { method: 'POST', body: data });
}

export const adminUpdatedStudentSchema = z.object({
  id: z.string(),
  updatedAt: z.string(),
});

export type AdminUpdateStudentInput = {
  firstName?: string;
  lastName?: string;
  nationalId?: string;
  birthDate?: string;
  gender?: string;
  schoolId?: string;
  educationLevel?: string;
  grade?: string;
  expectedUpdatedAt?: string;
};

export async function updateAdminStudent(
  id: string,
  data: AdminUpdateStudentInput,
): Promise<{ id: string; updatedAt: string }> {
  const response = await apiRequest<unknown>(`/admin/students/${id}`, {
    method: 'PATCH',
    body: data,
  });
  return adminUpdatedStudentSchema.parse(response.data);
}

export const adminParentSchema = z.object({
  id: z.string(),
  parentType: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  nationalId: z.string(),
  phoneNumber: z.string(),
  isPrimaryContact: z.boolean(),
});

export const adminAddressSchema = z.object({
  id: z.string(),
  title: z.string(),
  province: z.string(),
  city: z.string(),
  district: z.string().nullable(),
  streetAddress: z.string(),
  postalCode: z.string().nullable(),
  latitude: z.number().nullable(),
  longitude: z.number().nullable(),
  isActive: z.boolean(),
});

export const adminEmergencyContactSchema = z.object({
  id: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  relationship: z.string(),
  phoneNumber: z.string(),
  isActive: z.boolean(),
});

export const adminStudentDetailSchema = rawAdminStudentSchema.extend({
  birthDate: z.string().nullable(),
  gender: z.string().nullable(),
  updatedAt: z.string(),
  schoolType: z.string().nullable(),
  parents: z.array(adminParentSchema),
  addresses: z.array(adminAddressSchema),
  emergencyContacts: z.array(adminEmergencyContactSchema),
  enrollmentSummary: z
    .object({
      registrationId: z.string(),
      registrationStatus: z.string(),
      academicYear: z.string(),
      serviceType: z.string(),
      requestedStartDate: z.string().nullable(),
      submittedAt: z.string().nullable(),
      reviewedAt: z.string().nullable(),
      createdAt: z.string(),
      contract: z
        .object({
          id: z.string(),
          contractNumber: z.string(),
          contractStatus: z.string(),
          versionNumber: z.number(),
          generatedAt: z.string().nullable(),
          acceptedAt: z.string().nullable(),
        })
        .nullable(),
      price: z
        .object({
          id: z.string(),
          totalAmount: z.number(),
          prepaymentAmount: z.number(),
          installmentCount: z.number(),
          priceStatus: z.string(),
        })
        .nullable(),
      plan: z
        .object({
          id: z.string(),
          planType: z.string(),
          totalAmount: z.number(),
          prepaymentAmount: z.number(),
          remainingInstallmentAmount: z.number(),
          installmentCount: z.number(),
          planStatus: z.string(),
          paidInstallmentCount: z.number(),
          scheduleItems: z.array(
            z.object({
              itemType: z.string(),
              sequenceNumber: z.number(),
              amount: z.number(),
              dueDate: z.string().nullable(),
              itemStatus: z.string(),
              paidAt: z.string().nullable(),
            }),
          ),
        })
        .nullable(),
    })
    .nullable(),
});

export type AdminStudentDetail = z.infer<typeof adminStudentDetailSchema>;
export type AdminParent = z.infer<typeof adminParentSchema>;
export type AdminAddress = z.infer<typeof adminAddressSchema>;

export async function getAdminStudentDetail(id: string): Promise<AdminStudentDetail> {
  const response = await apiRequest<unknown>(`/admin/students/${id}`, {
    cache: 'no-store',
    timeoutMs: 8_000,
  });
  return adminStudentDetailSchema.parse(response.data);
}

export async function getAdminStudentPhoto(id: string) {
  const response = await apiRequest<{ status: 'APPROVED'; viewUrl: string; expiresInSeconds: number }>(
    `/admin/student-photos/students/${id}/photo`,
    { cache: 'no-store', timeoutMs: 8_000 },
  );
  return response.data;
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
