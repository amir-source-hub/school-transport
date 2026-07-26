import { z } from 'zod';
import { getAdminContracts } from '@/features/admin-finance/admin-contracts-api';
import { getAdminPayments } from '@/features/admin-payments/admin-payments-api';
import { getAdminRegistrations } from '@/features/admin-registrations/admin-registrations-api';

export const dashboardSummarySchema = z.object({
  pendingEnrollments: z.number(), contractsAwaitingAcceptance: z.number(),
  offlinePaymentsAwaitingReview: z.number(), upcomingPayments: z.number(), overduePayments: z.number(),
});
export const recentEnrollmentSchema = z.object({
  trackingCode: z.string(), studentName: z.string(), status: z.string(), nextAction: z.string(),
});
export type DashboardSummary = z.infer<typeof dashboardSummarySchema>;
export type RecentEnrollment = z.infer<typeof recentEnrollmentSchema>;

export async function getAdminDashboard() {
  const [{ registrations }, { contracts }, { payments }] = await Promise.all([
    getAdminRegistrations(), getAdminContracts(), getAdminPayments(),
  ]);
  return {
    summary: {
      pendingEnrollments: registrations.filter(({ status }) => ['ارسال‌شده', 'در حال بررسی'].includes(status)).length,
      contractsAwaitingAcceptance: contracts.filter(({ status }) => status === 'GENERATED').length,
      offlinePaymentsAwaitingReview: payments.filter(({ status }) => status === 'در انتظار بررسی').length,
      upcomingPayments: payments.filter(({ status }) => status !== 'تأییدشده').length,
      overduePayments: payments.filter(({ status }) => status === 'ردشده').length,
    },
    recentEnrollments: registrations.slice(0, 5).map(({ trackingCode, studentName, status, nextAction }) => ({
      trackingCode, studentName, status, nextAction,
    })),
  };
}
