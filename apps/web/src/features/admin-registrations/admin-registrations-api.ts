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

export const registrationsSchema = z.array(registrationSchema);

export type Registration = z.infer<typeof registrationSchema>;

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

export function getRegistrationTone(status: string) {
  if (status === 'تأییدشده') return 'success' as const;
  if (status === 'ردشده') return 'danger' as const;
  return 'warning' as const;
}
