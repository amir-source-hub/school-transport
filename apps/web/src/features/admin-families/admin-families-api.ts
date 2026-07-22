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

const fallbackFamilies: Family[] = [
  { id: 'fam-001', username: 'احمدی', primaryPhone: '۰۹۱۲۱۱۱۱۱۱۱', studentCount: 2, status: 'فعال', createdAt: '۱۴۰۴/۰۱/۱۰' },
  { id: 'fam-002', username: 'حسینی', primaryPhone: '۰۹۱۳۲۲۲۲۲۲۲', studentCount: 1, status: 'فعال', createdAt: '۱۴۰۴/۰۱/۱۵' },
  { id: 'fam-003', username: 'محمدی', primaryPhone: '۰۹۱۴۳۳۳۳۳۳۳', studentCount: 1, status: 'فعال', createdAt: '۱۴۰۳/۱۲/۰۱' },
  { id: 'fam-004', username: 'رضایی', primaryPhone: '۰۹۱۵۴۴۴۴۴۴۴', studentCount: 2, status: 'فعال', createdAt: '۱۴۰۴/۰۲/۰۵' },
  { id: 'fam-005', username: 'کریمی', primaryPhone: '۰۹۱۶۵۵۵۵۵۵۵', studentCount: 1, status: 'غیرفعال', createdAt: '۱۴۰۳/۱۱/۲۰' },
];

const fallbackDetails: Record<string, FamilyDetail> = {
  'fam-001': { id: 'fam-001', username: 'احمدی', primaryPhone: '۰۹۱۲۱۱۱۱۱۱۱', studentCount: 2, status: 'فعال', createdAt: '۱۴۰۴/۰۱/۱۰', students: [{ id: 'stu-001', firstName: 'سارا', lastName: 'احمدی', schoolName: 'مدرسه امید', grade: 'پایه چهارم', status: 'فعال' }] },
  'fam-002': { id: 'fam-002', username: 'حسینی', primaryPhone: '۰۹۱۳۲۲۲۲۲۲۲', studentCount: 1, status: 'فعال', createdAt: '۱۴۰۴/۰۱/۱۵', students: [{ id: 'stu-002', firstName: 'امیر', lastName: 'حسینی', schoolName: 'مدرسه دانش', grade: 'پایه پنجم', status: 'فعال' }] },
  'fam-003': { id: 'fam-003', username: 'محمدی', primaryPhone: '۰۹۱۴۳۳۳۳۳۳۳', studentCount: 1, status: 'فعال', createdAt: '۱۴۰۳/۱۲/۰۱', students: [{ id: 'stu-003', firstName: 'نرگس', lastName: 'محمدی', schoolName: 'مدرسه امید', grade: 'پایه سوم', status: 'فعال' }] },
  'fam-004': { id: 'fam-004', username: 'رضایی', primaryPhone: '۰۹۱۵۴۴۴۴۴۴۴', studentCount: 2, status: 'فعال', createdAt: '۱۴۰۴/۰۲/۰۵', students: [] },
  'fam-005': { id: 'fam-005', username: 'کریمی', primaryPhone: '۰۹۱۶۵۵۵۵۵۵۵', studentCount: 1, status: 'غیرفعال', createdAt: '۱۴۰۳/۱۱/۲۰', students: [] },
};

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

export async function getAdminFamily(id: string): Promise<{ family: FamilyDetail | null }> {
  try {
    const response = await apiRequest<unknown>(`/admin/families/${id}`, {
      cache: 'no-store',
      timeoutMs: 5_000,
    });
    return { family: familyDetailSchema.parse(response.data) };
  } catch {
    return { family: fallbackDetails[id] ?? null };
  }
}
