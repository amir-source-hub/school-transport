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
export const registrationStatusGroups = [
  { value: 'all', label: 'همه' },
  { value: 'submitted', label: 'ارسال‌شده' },
  { value: 'under_review', label: 'در حال بررسی' },
  { value: 'needs_correction', label: 'نیازمند اصلاح' },
  { value: 'approved', label: 'تأییدشده' },
  { value: 'rejected', label: 'ردشده' },
  { value: 'waiting_contract', label: 'در انتظار قرارداد' },
  { value: 'contract_ready', label: 'قرارداد آماده' },
  { value: 'accepted_contract', label: 'قرارداد پذیرفته‌شده' },
  { value: 'prepaid', label: 'پیش‌پرداخت انجام‌شده' },
  { value: 'installments', label: 'در حال پرداخت اقساط' },
  { value: 'completed', label: 'تسویه کامل' },
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
  paidInstallmentCount: z.number().default(0),
  installmentCount: z.number().default(0),
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
  ENROLLED: 'پیش‌پرداخت انجام‌شده',
  INSTALLMENTS_IN_PROGRESS: 'در حال پرداخت اقساط',
  PAYMENT_COMPLETED: 'تسویه کامل',
};
const actions: Record<string, string> = {
  SUBMITTED: 'شروع بررسی',
  UNDER_REVIEW: 'تصمیم مدیریت',
  NEEDS_CORRECTION: 'انتظار برای خانواده',
  APPROVED: 'ثبت قیمت',
  CONTRACT_PENDING: 'صدور قرارداد',
  CONTRACT_READY: 'انتظار برای خانواده',
  CONTRACT_ACCEPTED: 'انتظار برای پیش‌پرداخت',
  ENROLLED: 'تنظیم مبلغ باقی‌مانده',
  INSTALLMENTS_IN_PROGRESS: 'پیگیری اقساط باقی‌مانده',
  PAYMENT_COMPLETED: 'پرداخت‌ها تکمیل شده‌اند',
};
function generateTrackingCode(id: string): string {
  const lastSegment = id.split('-').pop()?.toUpperCase() ?? id.slice(0, 8);
  return `REG-${lastSegment}`;
}

const map = (raw: z.infer<typeof rawSchema>): RegistrationDetail => {
  const progress =
    raw.registrationStatus === 'INSTALLMENTS_IN_PROGRESS' && raw.installmentCount > 0
      ? ` (${raw.paidInstallmentCount.toLocaleString('fa-IR')} از ${raw.installmentCount.toLocaleString('fa-IR')})`
      : '';
  return {
    id: raw.id,
    trackingCode: generateTrackingCode(raw.id),
    studentName: raw.studentName,
    familyName: raw.familyName,
    schoolName: raw.schoolName,
    status: `${labels[raw.registrationStatus] ?? raw.registrationStatus}${progress}`,
    nextAction: actions[raw.registrationStatus] ?? 'مشاهده سابقه',
    createdAt: raw.createdAt.toISOString(),
    familyId: raw.familyId,
    studentId: raw.studentId,
    schoolId: raw.schoolId,
  };
};
export type AdminEnrollmentListParams = {
  q?: string;
  status?: string;
  sort?: 'studentName' | 'schoolName' | 'createdAt';
  direction?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
};

export type AdminEnrollmentListPagination = {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
};

export async function getAdminRegistrations(
  params: AdminEnrollmentListParams = {},
): Promise<{
  registrations: RegistrationDetail[];
  pagination: AdminEnrollmentListPagination;
}> {
  const search = new URLSearchParams();
  if (params.q) search.set('q', params.q);
  if (params.status && params.status !== 'all') search.set('status', params.status);
  if (params.sort && params.sort !== 'createdAt') search.set('sort', params.sort);
  if (params.direction && params.direction !== 'desc') search.set('direction', params.direction);
  if (params.page && params.page > 1) search.set('page', String(params.page));
  if (params.pageSize) search.set('pageSize', String(params.pageSize));
  const qs = search.toString();
  const response = await apiRequest<unknown>(`/admin/enrollments${qs ? `?${qs}` : ''}`, {
    cache: 'no-store',
  });
  return {
    registrations: z.array(rawSchema).parse(response.data).map(map),
    pagination: response.pagination ?? { page: 1, pageSize: 20, totalItems: 0, totalPages: 1 },
  };
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
  if (
    status === 'تأییدشده' ||
    status === 'پیش‌پرداخت انجام‌شده' ||
    status.startsWith('در حال پرداخت اقساط') ||
    status === 'تسویه کامل'
  )
    return 'success' as const;
  if (status === 'ردشده') return 'danger' as const;
  return 'warning' as const;
}
