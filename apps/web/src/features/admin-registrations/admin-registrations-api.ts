import { z } from 'zod';
import { apiRequest } from '@/lib/api-client';

export const registrationSchema = z.object({
  id: z.string(),
  trackingCode: z.string(),
  studentName: z.string(),
  familyName: z.string(),
  schoolName: z.string(),
  status: z.string(),
  nextAction: z.string(),
  createdAt: z.string().optional(),
});

export const registrationDetailSchema = z.object({
  id: z.string(),
  trackingCode: z.string(),
  studentName: z.string(),
  familyName: z.string(),
  schoolName: z.string(),
  status: z.string(),
  nextAction: z.string(),
  createdAt: z.string().optional(),
  familyId: z.string().optional(),
  studentId: z.string().optional(),
  schoolId: z.string().optional(),
});

export const registrationsSchema = z.array(registrationSchema);

export type Registration = z.infer<typeof registrationSchema>;
export type RegistrationDetail = z.infer<typeof registrationDetailSchema>;

export const registrationStatuses = [
  'همه',
  'ارسال‌شده',
  'در حال بررسی',
  'نیازمند اصلاح',
  'تأییدشده',
  'ردشده',
  'در انتظار قیمت',
] as const;

const fallbackRegistrations: Registration[] = [
  { id: 'reg-001', trackingCode: 'REG-۱۴۰۴-۰۰۱', studentName: 'سارا احمدی', familyName: 'خانواده احمدی', schoolName: 'مدرسه امید', status: 'در حال بررسی', nextAction: 'تصمیم مدیریت' },
  { id: 'reg-002', trackingCode: 'REG-۱۴۰۴-۰۰۲', studentName: 'امیر حسینی', familyName: 'خانواده حسینی', schoolName: 'مدرسه دانش', status: 'ارسال‌شده', nextAction: 'شروع بررسی' },
  { id: 'reg-003', trackingCode: 'REG-۱۴۰۴-۰۰۳', studentName: 'نرگس محمدی', familyName: 'خانواده محمدی', schoolName: 'مدرسه امید', status: 'نیازمند اصلاح', nextAction: 'انتظار برای خانواده' },
  { id: 'reg-004', trackingCode: 'REG-۱۴۰۴-۰۰۴', studentName: 'علی رضایی', familyName: 'خانواده رضایی', schoolName: 'مدرسه فرهنگ', status: 'تأییدشده', nextAction: 'ثبت قیمت' },
  { id: 'reg-005', trackingCode: 'REG-۱۴۰۴-۰۰۵', studentName: 'مریم کریمی', familyName: 'خانواده کریمی', schoolName: 'مدرسه دانش', status: 'ردشده', nextAction: 'مشاهده سابقه' },
  { id: 'reg-006', trackingCode: 'REG-۱۴۰۴-۰۰۶', studentName: 'محمد قاسمی', familyName: 'خانواده قاسمی', schoolName: 'مدرسه فرهنگ', status: 'در انتظار قیمت', nextAction: 'ثبت قیمت' },
];

const fallbackDetail: Record<string, RegistrationDetail> = {
  'reg-001': { id: 'reg-001', trackingCode: 'REG-۱۴۰۴-۰۰۱', studentName: 'سارا احمدی', familyName: 'خانواده احمدی', schoolName: 'مدرسه امید', status: 'در حال بررسی', nextAction: 'تصمیم مدیریت', familyId: 'fam-001', studentId: 'stu-001', schoolId: 'sch-001' },
  'reg-002': { id: 'reg-002', trackingCode: 'REG-۱۴۰۴-۰۰۲', studentName: 'امیر حسینی', familyName: 'خانواده حسینی', schoolName: 'مدرسه دانش', status: 'ارسال‌شده', nextAction: 'شروع بررسی', familyId: 'fam-002', studentId: 'stu-002', schoolId: 'sch-002' },
  'reg-003': { id: 'reg-003', trackingCode: 'REG-۱۴۰۴-۰۰۳', studentName: 'نرگس محمدی', familyName: 'خانواده محمدی', schoolName: 'مدرسه امید', status: 'نیازمند اصلاح', nextAction: 'انتظار برای خانواده', familyId: 'fam-003', studentId: 'stu-003', schoolId: 'sch-001' },
  'reg-004': { id: 'reg-004', trackingCode: 'REG-۱۴۰۴-۰۰۴', studentName: 'علی رضایی', familyName: 'خانواده رضایی', schoolName: 'مدرسه فرهنگ', status: 'تأییدشده', nextAction: 'ثبت قیمت', familyId: 'fam-004', studentId: 'stu-004', schoolId: 'sch-003' },
  'reg-005': { id: 'reg-005', trackingCode: 'REG-۱۴۰۴-۰۰۵', studentName: 'مریم کریمی', familyName: 'خانواده کریمی', schoolName: 'مدرسه دانش', status: 'ردشده', nextAction: 'مشاهده سابقه', familyId: 'fam-005', studentId: 'stu-005', schoolId: 'sch-002' },
  'reg-006': { id: 'reg-006', trackingCode: 'REG-۱۴۰۴-۰۰۶', studentName: 'محمد قاسمی', familyName: 'خانواده قاسمی', schoolName: 'مدرسه فرهنگ', status: 'در انتظار قیمت', nextAction: 'ثبت قیمت', familyId: 'fam-004', studentId: 'stu-004', schoolId: 'sch-003' },
};

export async function getAdminRegistrations(): Promise<{ registrations: Registration[] }> {
  try {
    const response = await apiRequest<unknown>('/admin/enrollments', {
      cache: 'no-store',
      timeoutMs: 5_000,
    });
    return { registrations: registrationsSchema.parse(response.data) };
  } catch {
    return { registrations: fallbackRegistrations };
  }
}

export async function getAdminRegistration(id: string): Promise<{ registration: RegistrationDetail | null }> {
  try {
    const response = await apiRequest<unknown>(`/admin/enrollments/${id}`, {
      cache: 'no-store',
      timeoutMs: 5_000,
    });
    return { registration: registrationDetailSchema.parse(response.data) };
  } catch {
    return { registration: fallbackDetail[id] ?? null };
  }
}

export async function startReview(id: string): Promise<void> {
  await apiRequest(`/admin/enrollments/${id}/start-review`, { method: 'POST', timeoutMs: 5_000 });
}

export async function approveEnrollment(id: string): Promise<void> {
  await apiRequest(`/admin/enrollments/${id}/approve`, { method: 'POST', timeoutMs: 5_000 });
}

export async function rejectEnrollment(id: string, reason: string): Promise<void> {
  await apiRequest(`/admin/enrollments/${id}/reject`, { method: 'POST', body: { reason }, timeoutMs: 5_000 });
}

export async function requestCorrection(id: string, reason: string): Promise<void> {
  await apiRequest(`/admin/enrollments/${id}/request-correction`, { method: 'POST', body: { reason }, timeoutMs: 5_000 });
}

export function getRegistrationTone(status: string) {
  if (status === 'تأییدشده') return 'success' as const;
  if (status === 'ردشده') return 'danger' as const;
  return 'warning' as const;
}
