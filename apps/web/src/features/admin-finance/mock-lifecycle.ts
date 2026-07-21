export type FinanceLifecycle = {
  id: string;
  student: string;
  registrationStatus: 'تأییدشده';
  price: number | null;
  contractStatus: 'بدون قرارداد' | 'صادرشده' | 'پذیرفته‌شده';
  paymentStarted: boolean;
};

export const demoFinanceLifecycles: readonly FinanceLifecycle[] = [
  {
    id: 'finance-demo-1',
    student: 'دانش‌آموز نمونه یک',
    registrationStatus: 'تأییدشده',
    price: null,
    contractStatus: 'بدون قرارداد',
    paymentStarted: false,
  },
  {
    id: 'finance-demo-2',
    student: 'دانش‌آموز نمونه دو',
    registrationStatus: 'تأییدشده',
    price: 120_000_000,
    contractStatus: 'صادرشده',
    paymentStarted: false,
  },
  {
    id: 'finance-demo-3',
    student: 'دانش‌آموز نمونه سه',
    registrationStatus: 'تأییدشده',
    price: 150_000_000,
    contractStatus: 'پذیرفته‌شده',
    paymentStarted: true,
  },
];

export function getPriceAction(record: FinanceLifecycle) {
  if (record.contractStatus === 'پذیرفته‌شده' || record.paymentStarted) {
    return {
      allowed: false,
      label: 'قیمت قفل است',
      reason: 'قرارداد پذیرفته شده یا پرداخت آغاز شده است.',
    };
  }

  return {
    allowed: true,
    label: record.price === null ? 'ثبت قیمت' : 'ویرایش قیمت',
    reason: 'فعال‌سازی فقط پس از اعتبارسنجی وضعیت جاری سرور انجام می‌شود.',
  };
}

export function getContractAction(record: FinanceLifecycle) {
  if (record.price === null) {
    return { label: 'در انتظار قیمت', reason: 'پیش از ایجاد قرارداد باید قیمت سرور ثبت شود.' };
  }
  if (record.contractStatus === 'پذیرفته‌شده') {
    return {
      label: 'جایگزینی کنترل‌شده',
      reason: 'نسخه پذیرفته‌شده تغییر نمی‌کند؛ جایگزینی به نسخه تازه و کنترل سرور نیاز دارد.',
    };
  }
  if (record.contractStatus === 'صادرشده') {
    return { label: 'مشاهده نسخه صادرشده', reason: 'نسخه موجود تا پاسخ سرور بازنویسی نمی‌شود.' };
  }
  return {
    label: 'ایجاد قرارداد',
    reason: 'ایجاد واقعی به اعتبارسنجی و ثبت حسابرسی سرور نیاز دارد.',
  };
}
