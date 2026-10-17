import type { PaymentOverview } from '@/features/finance/payments-api';
import { formatIrr, formatJalaliDate } from '@/lib/formatters';

export type JourneyState = 'complete' | 'current' | 'pending' | 'attention';
export type JourneyItem = {
  key: string;
  label: string;
  detail: string;
  state: JourneyState;
  href?: string;
  amount?: string;
  dueDate?: string;
};

type Receipt = { paymentScheduleItemId: string; status: string; submittedAt: Date };

const finishedReview = new Set([
  'APPROVED',
  'CONTRACT_PENDING',
  'CONTRACT_READY',
  'CONTRACT_ACCEPTED',
  'ENROLLED',
]);
const offeredPrice = new Set([
  'CONTRACT_PENDING',
  'CONTRACT_READY',
  'CONTRACT_ACCEPTED',
  'ENROLLED',
]);

export function buildJourneyStatus(input: {
  enrollmentCode: string;
  hasEnrollment: boolean;
  hasContract: boolean;
  contractAccepted: boolean;
  contractRejected?: boolean;
  payment?: PaymentOverview;
  receipts: readonly Receipt[];
}): { enrollment: JourneyItem[]; payments: JourneyItem[] } {
  const { enrollmentCode: code, hasEnrollment, hasContract, contractAccepted, payment } = input;
  const latestReceipt = (id: string) =>
    input.receipts
      .filter((receipt) => receipt.paymentScheduleItemId === id)
      .sort((a, b) => b.submittedAt.getTime() - a.submittedAt.getTime())[0];
  const statusForPayment = (item: PaymentOverview['items'][number]): JourneyState => {
    if (item.itemStatus === 'PAID') return 'complete';
    const receipt = latestReceipt(item.id);
    if (receipt?.status === 'REJECTED') return 'attention';
    if (receipt?.status === 'PENDING_REVIEW') return 'current';
    return 'pending';
  };
  const prepayment = payment?.items.find((item) => item.itemType === 'PREPAYMENT');
  const prepaymentState = prepayment ? statusForPayment(prepayment) : 'pending';
  const enrollment: JourneyItem[] = [
    {
      key: 'request',
      label: 'ثبت درخواست',
      detail: !hasEnrollment ? 'هنوز ثبت نشده' : code === 'DRAFT' ? 'پیش‌نویس' : 'ثبت شده',
      state: !hasEnrollment || code === 'DRAFT' ? 'current' : 'complete',
      href: '/student/enrollments',
    },
    {
      key: 'review',
      label: 'بررسی درخواست',
      detail:
        code === 'NEEDS_CORRECTION'
          ? 'نیازمند اصلاح'
          : code === 'REJECTED'
            ? 'رد شده'
            : code === 'CANCELLED'
              ? 'لغو شده'
              : finishedReview.has(code)
                ? 'تأیید شده'
                : code === 'SUBMITTED' || code === 'UNDER_REVIEW'
                  ? 'در حال بررسی'
                  : 'در انتظار بررسی',
      state:
        code === 'NEEDS_CORRECTION' || code === 'REJECTED' || code === 'CANCELLED'
          ? 'attention'
          : finishedReview.has(code)
            ? 'complete'
            : code === 'SUBMITTED' || code === 'UNDER_REVIEW'
              ? 'current'
              : 'pending',
      href: '/student/enrollments',
    },
    {
      key: 'price',
      label: 'اعلام قیمت',
      detail:
        offeredPrice.has(code) || hasContract
          ? 'اعلام شده'
          : code === 'APPROVED'
            ? 'در انتظار اعلام قیمت'
            : 'هنوز اعلام نشده',
      state:
        offeredPrice.has(code) || hasContract
          ? 'complete'
          : code === 'APPROVED'
            ? 'current'
            : 'pending',
      href: '/student/enrollments',
    },
    {
      key: 'contract',
      label: 'پذیرش قرارداد',
      detail: contractAccepted
        ? 'پذیرفته شده'
        : input.contractRejected
          ? 'رد شده'
          : hasContract
            ? 'در انتظار پذیرش'
            : 'هنوز آماده نیست',
      state: contractAccepted
        ? 'complete'
        : input.contractRejected
          ? 'attention'
          : hasContract
            ? 'current'
            : 'pending',
      href: '/student/contracts',
    },
    {
      key: 'active',
      label: 'فعال‌سازی سرویس',
      detail:
        code === 'ENROLLED'
          ? 'فعال'
          : prepaymentState === 'complete'
            ? 'در انتظار فعال‌سازی'
            : 'پس از تأیید پرداخت',
      state:
        code === 'ENROLLED' ? 'complete' : prepaymentState === 'complete' ? 'current' : 'pending',
    },
  ];

  const payments: JourneyItem[] = [];
  if (prepayment) {
    const receipt = latestReceipt(prepayment.id);
    payments.push({
      key: prepayment.id,
      label: payment?.plan.planType === 'FULL' ? 'پرداخت کامل' : 'پیش‌پرداخت',
      detail:
        prepaymentState === 'complete'
          ? 'تأیید شده'
          : receipt?.status === 'PENDING_REVIEW'
            ? 'رسید در انتظار بررسی'
            : receipt?.status === 'REJECTED'
              ? 'رسید رد شده؛ ارسال دوباره لازم است'
              : contractAccepted
                ? 'در انتظار پرداخت و ارسال رسید'
                : 'پس از پذیرش قرارداد',
      state: prepaymentState === 'pending' && contractAccepted ? 'current' : prepaymentState,
      href: '/student/payments',
      amount: formatIrr(prepayment.amount),
      dueDate: prepayment.dueDate ? formatJalaliDate(prepayment.dueDate) : undefined,
    });
  } else {
    payments.push({
      key: 'prepayment',
      label: 'پیش‌پرداخت',
      detail: 'پس از پذیرش قرارداد مشخص می‌شود',
      state: 'pending',
    });
  }
  const installments =
    payment?.items
      .filter((item) => item.itemType === 'INSTALLMENT')
      .sort((a, b) => a.sequenceNumber - b.sequenceNumber) ?? [];
  const firstUnpaid = installments.find((item) => item.itemStatus !== 'PAID');
  for (const item of installments) {
    const receipt = latestReceipt(item.id);
    const state = statusForPayment(item);
    payments.push({
      key: item.id,
      label: `قسط ${item.sequenceNumber.toLocaleString('fa-IR')}`,
      detail:
        state === 'complete'
          ? 'تأیید شده'
          : receipt?.status === 'PENDING_REVIEW'
            ? 'رسید در انتظار بررسی'
            : receipt?.status === 'REJECTED'
              ? 'رسید رد شده؛ ارسال دوباره لازم است'
              : prepaymentState !== 'complete'
                ? 'پس از تأیید پیش‌پرداخت'
                : 'در انتظار پرداخت و ارسال رسید',
      state:
        state === 'pending' && item.id === firstUnpaid?.id && prepaymentState === 'complete'
          ? 'current'
          : state,
      href: '/student/payments',
      amount: formatIrr(item.amount),
      dueDate: item.dueDate ? formatJalaliDate(item.dueDate) : undefined,
    });
  }
  if (
    payment &&
    payment.plan.planType !== 'FULL' &&
    installments.length === 0 &&
    payment.plan.remainingInstallmentAmount > 0
  ) {
    payments.push({
      key: 'schedule',
      label: 'برنامه اقساط',
      detail:
        prepaymentState === 'complete'
          ? 'در انتظار تنظیم توسط مدیریت'
          : 'پس از تأیید پیش‌پرداخت تنظیم می‌شود',
      state: prepaymentState === 'complete' ? 'current' : 'pending',
    });
  }
  return { enrollment, payments };
}
