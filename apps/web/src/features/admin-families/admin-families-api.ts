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

export async function getAdminFamilies(): Promise<{ families: Family[] }> {
  const response = await apiRequest<unknown>('/admin/families', {
    cache: 'no-store',
    timeoutMs: 8_000,
  });
  return { families: familiesSchema.parse(response.data) };
}

export async function getAdminFamily(id: string): Promise<{ family: FamilyDetail | null }> {
  const response = await apiRequest<unknown>(`/admin/families/${id}`, {
    cache: 'no-store',
    timeoutMs: 8_000,
  });
  return { family: familyDetailSchema.parse(response.data) };
}
