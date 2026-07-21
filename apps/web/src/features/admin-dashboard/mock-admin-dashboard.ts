export const demoAdminSummary = {
  pendingEnrollments: 12,
  contractsAwaitingAcceptance: 5,
  offlinePaymentsAwaitingReview: 3,
  upcomingPayments: 18,
  overduePayments: 4,
} as const;

export const demoRecentEnrollments = [
  {
    trackingCode: 'پیگیری-نمونه-۱',
    student: 'دانش‌آموز نمونه یک',
    status: 'در حال بررسی',
    nextAction: 'بررسی درخواست',
  },
  {
    trackingCode: 'پیگیری-نمونه-۲',
    student: 'دانش‌آموز نمونه دو',
    status: 'در انتظار قیمت',
    nextAction: 'ثبت قیمت',
  },
  {
    trackingCode: 'پیگیری-نمونه-۳',
    student: 'دانش‌آموز نمونه سه',
    status: 'نیازمند اصلاح',
    nextAction: 'انتظار برای خانواده',
  },
] as const;
