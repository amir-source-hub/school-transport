import { z } from 'zod';
import { apiRequest } from '@/lib/api-client';

export const dashboardSummarySchema = z.object({
  pendingEnrollments: z.number(),
  contractsAwaitingAcceptance: z.number(),
  offlinePaymentsAwaitingReview: z.number(),
  upcomingPayments: z.number(),
  overduePayments: z.number(),
});

export const recentEnrollmentSchema = z.object({
  trackingCode: z.string(),
  studentName: z.string(),
  status: z.string(),
  nextAction: z.string(),
});

export const dashboardDataSchema = z.object({
  summary: dashboardSummarySchema,
  recentEnrollments: z.array(recentEnrollmentSchema),
});

export type DashboardSummary = z.infer<typeof dashboardSummarySchema>;
export type RecentEnrollment = z.infer<typeof recentEnrollmentSchema>;

const fallbackSummary: DashboardSummary = {
  pendingEnrollments: 12,
  contractsAwaitingAcceptance: 5,
  offlinePaymentsAwaitingReview: 3,
  upcomingPayments: 18,
  overduePayments: 4,
};

const fallbackEnrollments: RecentEnrollment[] = [
  { trackingCode: 'REG-۱۴۰۴-۰۰۱', studentName: 'سارا احمدی', status: 'در حال بررسی', nextAction: 'بررسی درخواست' },
  { trackingCode: 'REG-۱۴۰۴-۰۰۲', studentName: 'امیر حسینی', status: 'در انتظار قیمت', nextAction: 'ثبت قیمت' },
  { trackingCode: 'REG-۱۴۰۴-۰۰۳', studentName: 'نرگس محمدی', status: 'نیازمند اصلاح', nextAction: 'انتظار برای خانواده' },
];

export async function getAdminDashboard(): Promise<{ summary: DashboardSummary; recentEnrollments: RecentEnrollment[] }> {
  try {
    const response = await apiRequest<unknown>('/admin/dashboard', {
      cache: 'no-store',
      timeoutMs: 5_000,
    });
    return dashboardDataSchema.parse(response.data);
  } catch {
    return { summary: fallbackSummary, recentEnrollments: fallbackEnrollments };
  }
}
