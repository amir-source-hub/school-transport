import { z } from 'zod';
import { apiRequest } from '@/lib/api-client';

export const adminStudentSchema = z.object({
  id: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  nationalId: z.string(),
  schoolName: z.string().nullable(),
  grade: z.string().nullable(),
  status: z.string(),
  familyName: z.string(),
});

export const adminStudentsSchema = z.array(adminStudentSchema);

export type AdminStudent = z.infer<typeof adminStudentSchema>;

const fallbackStudents: AdminStudent[] = [
  { id: 'stu-001', firstName: 'سارا', lastName: 'احمدی', nationalId: '۰۰۱۰۰۰۰۰۰۱', schoolName: 'مدرسه امید', grade: 'پایه چهارم', status: 'فعال', familyName: 'احمدی' },
  { id: 'stu-002', firstName: 'امیر', lastName: 'حسینی', nationalId: '۰۰۲۰۰۰۰۰۰۲', schoolName: 'مدرسه دانش', grade: 'پایه پنجم', status: 'فعال', familyName: 'حسینی' },
  { id: 'stu-003', firstName: 'نرگس', lastName: 'محمدی', nationalId: '۰۰۳۰۰۰۰۰۰۳', schoolName: 'مدرسه امید', grade: 'پایه سوم', status: 'فعال', familyName: 'محمدی' },
  { id: 'stu-004', firstName: 'علی', lastName: 'رضایی', nationalId: '۰۰۴۰۰۰۰۰۰۴', schoolName: 'مدرسه فرهنگ', grade: 'پایه ششم', status: 'فعال', familyName: 'رضایی' },
  { id: 'stu-005', firstName: 'مریم', lastName: 'کریمی', nationalId: '۰۰۵۰۰۰۰۰۰۵', schoolName: 'مدرسه دانش', grade: 'پایه دوم', status: 'فعال', familyName: 'کریمی' },
];

export async function getAdminStudents(): Promise<{ students: AdminStudent[] }> {
  try {
    const response = await apiRequest<unknown>('/admin/students', {
      cache: 'no-store',
      timeoutMs: 5_000,
    });
    return { students: adminStudentsSchema.parse(response.data) };
  } catch {
    return { students: fallbackStudents };
  }
}

export async function archiveStudent(id: string): Promise<void> {
  await apiRequest(`/students/${id}`, {
    method: 'DELETE',
    timeoutMs: 5_000,
  });
}
