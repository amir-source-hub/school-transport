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

export const familiesSchema = z.array(familySchema);

export type Family = z.infer<typeof familySchema>;

const fallbackFamilies: Family[] = [
  { id: 'fam-001', username: 'احمدی', primaryPhone: '۰۹۱۲۱۱۱۱۱۱۱', studentCount: 2, status: 'فعال', createdAt: '۱۴۰۴/۰۱/۱۰' },
  { id: 'fam-002', username: 'حسینی', primaryPhone: '۰۹۱۳۲۲۲۲۲۲۲', studentCount: 1, status: 'فعال', createdAt: '۱۴۰۴/۰۱/۱۵' },
  { id: 'fam-003', username: 'محمدی', primaryPhone: '۰۹۱۴۳۳۳۳۳۳۳', studentCount: 1, status: 'فعال', createdAt: '۱۴۰۳/۱۲/۰۱' },
  { id: 'fam-004', username: 'رضایی', primaryPhone: '۰۹۱۵۴۴۴۴۴۴۴', studentCount: 2, status: 'فعال', createdAt: '۱۴۰۴/۰۲/۰۵' },
  { id: 'fam-005', username: 'کریمی', primaryPhone: '۰۹۱۶۵۵۵۵۵۵۵', studentCount: 1, status: 'غیرفعال', createdAt: '۱۴۰۳/۱۱/۲۰' },
];

export async function getAdminFamilies(): Promise<{ families: Family[] }> {
  try {
    const response = await apiRequest<unknown>('/admin/families', {
      cache: 'no-store',
      timeoutMs: 5_000,
    });
    return { families: familiesSchema.parse(response.data) };
  } catch {
    return { families: fallbackFamilies };
  }
}
