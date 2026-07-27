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
export const registrationDetailSchema = registrationSchema.extend({
  familyId: z.string().optional(),
  studentId: z.string().optional(),
  schoolId: z.string().optional(),
});
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

const rawSchema = z.object({
  id: z.string(),
  studentId: z.string(),
  studentName: z.string(),
  familyName: z.string(),
  familyId: z.string(),
  schoolId: z.string(),
  schoolName: z.string(),
  registrationStatus: z.string(),
  createdAt: z.coerce.date(),
});
const labels: Record<string, string> = {
  DRAFT: 'پیش‌نویس',
  SUBMITTED: 'ارسال‌شده',
  UNDER_REVIEW: 'در حال بررسی',
  NEEDS_CORRECTION: 'نیازمند اصلاح',
  APPROVED: 'تأییدشده',
  REJECTED: 'ردشده',
  CONTRACT_PENDING: 'در انتظار قرارداد',
  CONTRACT_READY: 'قرارداد آماده',
  CONTRACT_ACCEPTED: 'قرارداد پذیرفته‌شده',
  CANCELLED: 'لغوشده',
};
const actions: Record<string, string> = {
  SUBMITTED: 'شروع بررسی',
  UNDER_REVIEW: 'تصمیم مدیریت',
  NEEDS_CORRECTION: 'انتظار برای خانواده',
  APPROVED: 'ثبت قیمت',
  CONTRACT_PENDING: 'صدور قرارداد',
  CONTRACT_READY: 'انتظار برای خانواده',
};
function generateTrackingCode(id: string): string {
  const lastSegment = id.split('-').pop()?.toUpperCase() ?? id.slice(0, 8);
  return `REG-${lastSegment}`;
}

const map = (raw: z.infer<typeof rawSchema>): RegistrationDetail => ({
  id: raw.id,
  trackingCode: generateTrackingCode(raw.id),
  studentName: raw.studentName,
  familyName: raw.familyName,
  schoolName: raw.schoolName,
  status: labels[raw.registrationStatus] ?? raw.registrationStatus,
  nextAction: actions[raw.registrationStatus] ?? 'مشاهده سابقه',
  createdAt: raw.createdAt.toISOString(),
  familyId: raw.familyId,
  studentId: raw.studentId,
  schoolId: raw.schoolId,
});
export async function getAdminRegistrations() {
  const response = await apiRequest<unknown>('/admin/enrollments', { cache: 'no-store' });
  return { registrations: z.array(rawSchema).parse(response.data).map(map) };
}
export async function getAdminRegistration(id: string) {
  const response = await apiRequest<unknown>(`/admin/enrollments/${id}`, { cache: 'no-store' });
  return { registration: map(rawSchema.parse(response.data)) };
}
export const startReview = async (id: string) => {
  await apiRequest(`/admin/enrollments/${id}/start-review`, { method: 'POST' });
};
export const approveEnrollment = async (id: string) => {
  await apiRequest(`/admin/enrollments/${id}/approve`, { method: 'POST' });
};
export const rejectEnrollment = async (id: string, reason: string) => {
  await apiRequest(`/admin/enrollments/${id}/reject`, { method: 'POST', body: { reason } });
};
export const requestCorrection = async (id: string, reason: string) => {
  await apiRequest(`/admin/enrollments/${id}/request-correction`, {
    method: 'POST',
    body: { message: reason },
  });
};
export function getRegistrationTone(status: string) {
  if (status === 'تأییدشده') return 'success' as const;
  if (status === 'ردشده') return 'danger' as const;
  return 'warning' as const;
}
