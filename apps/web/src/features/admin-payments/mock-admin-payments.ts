export type OfflineReviewStatus = 'در انتظار بررسی' | 'تأییدشده' | 'ردشده';

export const demoOfflinePayments = [
  {
    id: 'offline-review-001',
    student: 'دانش‌آموز نمونه یک',
    family: 'خانواده نمونه یک',
    invoice: 'قسط ماه دوم',
    expectedAmount: 25_000_000,
    submittedAmount: 25_000_000,
    reference: 'TRX-DEMO-1001',
    paidAt: 'زمان پرداخت نمایشی',
    status: 'در انتظار بررسی',
  },
  {
    id: 'offline-review-002',
    student: 'دانش‌آموز نمونه دو',
    family: 'خانواده نمونه دو',
    invoice: 'پیش‌پرداخت',
    expectedAmount: 40_000_000,
    submittedAmount: 40_000_000,
    reference: 'TRX-DEMO-1002',
    paidAt: 'زمان پرداخت نمایشی',
    status: 'تأییدشده',
  },
] as const satisfies readonly {
  id: string;
  student: string;
  family: string;
  invoice: string;
  expectedAmount: number;
  submittedAmount: number;
  reference: string;
  paidAt: string;
  status: OfflineReviewStatus;
}[];

export function getOfflineReviewTone(status: OfflineReviewStatus) {
  if (status === 'تأییدشده') return 'success' as const;
  if (status === 'ردشده') return 'danger' as const;
  return 'warning' as const;
}
