export type PaymentReturnState = 'pending' | 'success' | 'failed' | 'cancelled' | 'completed';

export const paymentReturnStates = {
  pending: {
    label: 'در انتظار تأیید',
    title: 'نتیجه پرداخت هنوز قطعی نیست',
    description:
      'سرور نمایشی هنوز نتیجه نهایی را تأیید نکرده است. صفحه را بعداً بررسی کنید و دوباره پرداخت نکنید.',
    tone: 'warning',
  },
  success: {
    label: 'موفق و تأییدشده',
    title: 'پرداخت توسط سرور تأیید شد',
    description:
      'این حالت فقط نتیجه تأییدشده سرور را نمایش می‌دهد؛ بازگشت از درگاه به‌تنهایی موفقیت محسوب نمی‌شود.',
    tone: 'info',
  },
  failed: {
    label: 'ناموفق',
    title: 'پرداخت تکمیل نشد',
    description:
      'مبلغی به مانده پرداخت‌شده اضافه نشده است. پس از مشخص‌شدن وضعیت نهایی می‌توانید دوباره تلاش کنید.',
    tone: 'danger',
  },
  cancelled: {
    label: 'لغوشده',
    title: 'پرداخت لغو شد',
    description:
      'فاکتور همچنان پرداخت‌نشده است و مبلغی از مانده کسر نشده است. این وضعیت از پاسخ تأییدشده سرور می‌آید.',
    tone: 'warning',
  },
  completed: {
    label: 'قبلاً پرداخت‌شده',
    title: 'این فاکتور قبلاً تکمیل شده است',
    description:
      'هیچ پرداخت تازه‌ای ایجاد نشده است. نتیجه موجود و تأییدشده بدون تغییر دوباره نمایش داده می‌شود.',
    tone: 'info',
  },
} as const satisfies Record<
  PaymentReturnState,
  { label: string; title: string; description: string; tone: 'info' | 'warning' | 'danger' }
>;
