import { Breadcrumbs } from '@/components/navigation/breadcrumbs';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { OfflinePaymentForm } from '@/features/finance/offline-payment-form';
import { getOfflineSubmissions, getPayments } from '@/features/finance/payments-api';
import { formatIrr } from '@/lib/formatters';
import { formatJalaliDate } from '@/lib/formatters';
import { OnlinePaymentButton } from '@/features/finance/online-payment-button';

export const metadata = { title: 'پرداخت‌ها' };
export const dynamic = 'force-dynamic';

const planStatusLabels: Record<string, string> = {
  PENDING: 'در انتظار پیش‌پرداخت',
  ACTIVE: 'فعال',
  COMPLETED: 'تسویه‌شده',
  CANCELLED: 'لغوشده',
};

export default async function PaymentsPage() {
  const [overviews, offlineSubmissions] = await Promise.all([
    getPayments(),
    getOfflineSubmissions(),
  ]);
  const pendingOfflineItemIds = new Set(
    offlineSubmissions
      .filter((submission) => submission.status === 'PENDING_REVIEW')
      .map((submission) => submission.paymentScheduleItemId),
  );
  const itemContext = new Map(
    overviews.flatMap((overview) =>
      overview.items.map(
        (item) =>
          [
            item.id,
            {
              student: `${overview.studentFirstName} ${overview.studentLastName}`,
              installment:
                item.itemType === 'PREPAYMENT'
                  ? 'پیش‌پرداخت'
                  : overview.plan.planType === 'FULL'
                    ? 'پرداخت یکجای باقی‌مانده'
                    : `قسط ${item.sequenceNumber}`,
              amount: formatIrr(item.amount),
              dueDate: item.dueDate ? formatJalaliDate(item.dueDate) : 'تعیین نشده',
            },
          ] as const,
      ),
    ),
  );
  const unpaid = overviews.flatMap(({ plan, items, studentFirstName, studentLastName }) =>
    items
      .filter(({ id, itemStatus }) => itemStatus !== 'PAID' && !pendingOfflineItemIds.has(id))
      .map((item) => ({
        id: item.id,
        label: `${studentFirstName} ${studentLastName} — ${item.itemType === 'PREPAYMENT' ? 'پیش‌پرداخت' : plan.planType === 'FULL' ? 'پرداخت یکجای باقی‌مانده' : `قسط ${item.sequenceNumber}`} — ${formatIrr(item.amount)}`,
      })),
  );
  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[{ label: 'پنل دانش‌آموز', href: '/student/dashboard' }, { label: 'پرداخت‌ها' }]}
      />
      <div>
        <p className="text-sm font-bold text-primary">امور مالی</p>
        <h1 className="mt-1 text-2xl font-black sm:text-3xl">پرداخت‌ها و اقساط</h1>
      </div>
      {overviews.length === 0 && (
        <Card>
          <p className="text-muted">هنوز برنامه پرداختی ایجاد نشده است.</p>
        </Card>
      )}
      {overviews.map((overview) => {
        const paid = overview.items.reduce((sum, item) => sum + item.paidAmount, 0);
        return (
          <Card key={overview.plan.id}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-black">
                  {overview.studentFirstName} {overview.studentLastName}
                </h2>
                <p className="text-sm text-muted">
                  {formatIrr(paid)} پرداخت‌شده از {formatIrr(overview.plan.totalAmount)}
                </p>
              </div>
              <Badge tone={overview.plan.planStatus === 'COMPLETED' ? 'success' : 'warning'}>
                {planStatusLabels[overview.plan.planStatus] ?? overview.plan.planStatus}
              </Badge>
            </div>
            <div className="mt-5 space-y-2">
              {overview.items.map((item) => (
                <div
                  key={item.id}
                  className="grid items-center gap-3 rounded-lg border border-border p-4 sm:grid-cols-[1fr_auto_auto_auto]"
                >
                  <div>
                    <p className="font-bold">
                      {item.itemType === 'PREPAYMENT'
                        ? 'پیش‌پرداخت'
                        : overview.plan.planType === 'FULL'
                          ? 'پرداخت یکجای باقی‌مانده'
                          : `قسط ${item.sequenceNumber}`}
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      سررسید: {item.dueDate ? formatJalaliDate(item.dueDate) : 'تعیین نشده'}
                    </p>
                  </div>
                  <strong>{formatIrr(item.amount)}</strong>
                  <Badge tone={item.itemStatus === 'PAID' ? 'success' : 'warning'}>
                    {item.itemStatus === 'PAID' ? 'پرداخت‌شده' : 'پرداخت‌نشده'}
                  </Badge>
                  {item.itemStatus !== 'PAID' ? (
                    <OnlinePaymentButton scheduleItemId={item.id} amount={item.amount} />
                  ) : (
                    <span className="text-sm font-bold text-success">تسویه شد</span>
                  )}
                </div>
              ))}
            </div>
            {overview.transactions.length > 0 && (
              <div className="mt-5 border-t border-border pt-4">
                <h3 className="font-bold">تراکنش‌ها</h3>
                {overview.transactions.map((transaction) => (
                  <p key={transaction.id} className="mt-2 text-sm text-muted">
                    {transaction.gatewayTransactionId ?? transaction.id} —{' '}
                    {transaction.transactionStatus}
                  </p>
                ))}
              </div>
            )}
          </Card>
        );
      })}
      <Card>
        <h2 className="mb-4 text-lg font-black">ثبت پرداخت آفلاین</h2>
        <OfflinePaymentForm items={unpaid} />
      </Card>
      {offlineSubmissions.length > 0 && (
        <Card>
          <h2 className="mb-4 text-lg font-black">وضعیت رسیدهای آفلاین</h2>
          <div className="space-y-3">
            {offlineSubmissions.map((submission) => (
              <div key={submission.id} className="rounded-xl border border-border p-4 text-sm">
                {itemContext.get(submission.paymentScheduleItemId) && (
                  <div className="mb-3 grid gap-2 rounded-xl bg-surface-inset p-3 sm:grid-cols-4">
                    <strong>{itemContext.get(submission.paymentScheduleItemId)?.student}</strong>
                    <span>{itemContext.get(submission.paymentScheduleItemId)?.installment}</span>
                    <span>{itemContext.get(submission.paymentScheduleItemId)?.amount}</span>
                    <span>
                      سررسید: {itemContext.get(submission.paymentScheduleItemId)?.dueDate}
                    </span>
                  </div>
                )}
                <p className="font-bold">
                  {submission.status === 'PENDING_REVIEW'
                    ? 'در انتظار بررسی'
                    : submission.status === 'APPROVED'
                      ? 'تأییدشده'
                      : 'نیازمند اصلاح'}
                </p>
                {submission.rejectionReason && (
                  <p className="mt-2 text-danger">{submission.rejectionReason}</p>
                )}
                {submission.status === 'PENDING_REVIEW' && (
                  <p className="mt-2 text-muted">
                    رسید ثبت شده است؛ نتیجه بررسی مدیریت در همین بخش نمایش داده می‌شود.
                  </p>
                )}
                {submission.status === 'REJECTED' && (
                  <p className="mt-2 font-bold text-danger">
                    پس از اصلاح مورد اعلام‌شده، از فرم بالا رسید تازه ارسال کنید.
                  </p>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
