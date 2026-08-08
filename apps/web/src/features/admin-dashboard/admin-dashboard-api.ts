import { z } from 'zod';
import { getAdminContracts } from '@/features/admin-finance/admin-contracts-api';
import { getAdminPayments } from '@/features/admin-payments/admin-payments-api';
import { getAdminRegistrations } from '@/features/admin-registrations/admin-registrations-api';

export const dashboardSummarySchema = z.object({
  pendingEnrollments: z.number(),
  contractsAwaitingAcceptance: z.number(),
  offlinePaymentsAwaitingReview: z.number(),
  upcomingPayments: z.number(),
  overduePayments: z.number(),
});
export const recentEnrollmentSchema = z.object({
  id: z.string(),
  trackingCode: z.string(),
  studentName: z.string(),
  status: z.string(),
  nextAction: z.string(),
});
export type DashboardSummary = z.infer<typeof dashboardSummarySchema>;
export type RecentEnrollment = z.infer<typeof recentEnrollmentSchema>;

export async function getAdminDashboard() {
  const [{ registrations }, { contracts }, { payments }] = await Promise.all([
    getAdminRegistrations({ pageSize: 500 }),
    getAdminContracts(),
    getAdminPayments(),
  ]);
  const scheduleItems = payments.flatMap(({ prepayment, installments }) => [
    prepayment,
    ...installments,
  ]);
  const now = Date.now();
  return {
    summary: {
      pendingEnrollments: registrations.filter(({ status }) =>
        ['ارسال‌شده', 'در حال بررسی'].includes(status),
      ).length,
      contractsAwaitingAcceptance: contracts.filter(({ status }) => status === 'GENERATED').length,
      offlinePaymentsAwaitingReview: scheduleItems.filter(
        ({ transaction }) => transaction?.status === 'در انتظار بررسی',
      ).length,
      upcomingPayments: scheduleItems.filter(
        ({ paid, dueDate }) => !paid && (!dueDate || Date.parse(dueDate) >= now),
      ).length,
      overduePayments: scheduleItems.filter(
        ({ paid, dueDate }) => !paid && Boolean(dueDate) && Date.parse(dueDate!) < now,
      ).length,
    },
    recentEnrollments: registrations
      .slice(0, 5)
      .map(({ id, trackingCode, studentName, status, nextAction }) => ({
        id,
        trackingCode,
        studentName,
        status,
        nextAction,
      })),
  };
}
