import { z } from 'zod';
import { apiRequest } from '@/lib/api-client';
import type { GuidedEnrollmentInput } from '@/features/enrollment/enrollments-api';

export const familySchema = z.object({
  id: z.string(),
  username: z.string(),
  primaryPhone: z.string().nullable(),
  studentCount: z.number(),
  status: z.string(),
  createdAt: z.string().optional(),
});

export const familyDetailSchema = z.object({
  id: z.string(),
  username: z.string(),
  primaryPhone: z.string().nullable(),
  studentCount: z.number(),
  status: z.string(),
  createdAt: z.string().optional(),
  parents: z.array(z.object({
    id: z.string(),
    parentType: z.string(),
    firstName: z.string(),
    lastName: z.string(),
    nationalId: z.string(),
    phoneNumber: z.string(),
    isPrimaryContact: z.boolean(),
  })),
  addresses: z.array(z.object({
    id: z.string(), title: z.string(), province: z.string(), city: z.string(),
    district: z.string().nullable(), streetAddress: z.string(), postalCode: z.string().nullable(),
    latitude: z.number().nullable(), longitude: z.number().nullable(), isActive: z.boolean(),
  })),
  emergencyContacts: z.array(z.object({
    id: z.string(), firstName: z.string(), lastName: z.string(), relationship: z.string(),
    phoneNumber: z.string(), isActive: z.boolean(),
  })),
  students: z.array(z.object({
    id: z.string(),
    firstName: z.string(),
    lastName: z.string(),
    schoolName: z.string().nullable(),
    grade: z.string().nullable(),
    status: z.string(),
  })).optional(),
});

export const familiesSchema = z.array(familySchema);

export type Family = z.infer<typeof familySchema>;
export type FamilyDetail = z.infer<typeof familyDetailSchema>;
export type AdminParent = FamilyDetail['parents'][number];

export async function getAdminFamilies(): Promise<{ families: Family[] }> {
  const response = await apiRequest<unknown>('/admin/families', {
    cache: 'no-store',
    timeoutMs: 8_000,
  });
  return { families: familiesSchema.parse(response.data) };
}

export async function createFamilyParent(
  familyId: string,
  data: {
    parentType: 'FATHER' | 'MOTHER';
    firstName: string;
    lastName: string;
    nationalId: string;
    phoneNumber: string;
    isPrimaryContact?: boolean;
  },
) {
  await apiRequest(`/admin/families/${familyId}/parents`, { method: 'POST', body: data });
}

export async function updateFamilyParent(
  familyId: string,
  parentId: string,
  data: {
    firstName: string;
    lastName: string;
    nationalId: string;
    phoneNumber: string;
    isPrimaryContact?: boolean;
  },
) {
  await apiRequest(`/admin/families/${familyId}/parents/${parentId}`, {
    method: 'PATCH',
    body: data,
  });
}

export async function deleteFamilyParent(familyId: string, parentId: string) {
  await apiRequest(`/admin/families/${familyId}/parents/${parentId}`, { method: 'DELETE' });
}

export async function getAdminFamily(id: string): Promise<{ family: FamilyDetail | null }> {
  const response = await apiRequest<unknown>(`/admin/families/${id}`, {
    cache: 'no-store',
    timeoutMs: 8_000,
  });
  return { family: familyDetailSchema.parse(response.data) };
}

export type AdminEnrollmentActions = {
  signContractOnBehalf?: { reason?: string; source?: string };
  cashPrepayment?: { referenceNumber: string; paidAt?: string; description?: string };
};

export type AdminFamilyEnrollmentResult = {
  registrationId: string;
  studentId: string;
  contractId: string;
  scheduleItemId: string;
  prepaymentAmount: number;
  status: 'CONTRACT_READY' | 'CONTRACT_ACCEPTED' | 'ENROLLED';
  parentActionRequired: boolean;
};

export async function createAdminFamilyEnrollment(
  familyId: string,
  input: GuidedEnrollmentInput,
  actions?: AdminEnrollmentActions,
) {
  return apiRequest<AdminFamilyEnrollmentResult>(
    `/admin/enrollments/families/${familyId}/guided`,
    {
      method: 'POST',
      body: actions ? { ...input, adminActions: actions } : input,
    },
  );
}

export type AdminAddressInput = {
  title: string;
  province: string;
  city: string;
  district?: string;
  streetAddress: string;
  postalCode?: string;
  latitude?: number;
  longitude?: number;
};

export async function createAdminFamilyAddress(familyId: string, data: AdminAddressInput) {
  await apiRequest(`/admin/families/${familyId}/addresses`, { method: 'POST', body: data });
}

export async function updateAdminFamilyAddress(
  familyId: string,
  addressId: string,
  data: Partial<AdminAddressInput>,
) {
  await apiRequest(`/admin/families/${familyId}/addresses/${addressId}`, {
    method: 'PATCH',
    body: data,
  });
}

export async function updateAdminFamilyEmergencyContact(
  familyId: string,
  contactId: string,
  data: { firstName: string; lastName: string; relationship: string; phoneNumber: string },
) {
  await apiRequest(`/admin/families/${familyId}/emergency-contacts/${contactId}`, {
    method: 'PATCH',
    body: data,
  });
}
