import { z } from 'zod';
import { apiRequest } from '@/lib/api-client';

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
  data: Omit<AdminParent, 'id'>,
) {
  await apiRequest(`/admin/families/${familyId}/parents`, { method: 'POST', body: data });
}

export async function updateFamilyParent(
  familyId: string,
  parentId: string,
  data: Omit<AdminParent, 'id' | 'parentType'>,
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
