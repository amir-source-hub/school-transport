import { Breadcrumbs } from '@/components/navigation/breadcrumbs';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { OfflinePaymentForm } from '@/features/finance/offline-payment-form';
import { getPayments } from '@/features/finance/payments-api';
import { formatIrr } from '@/lib/formatters';
import { formatJalaliDate } from '@/lib/formatters';
import { OnlinePaymentButton } from '@/features/finance/online-payment-button';

export const metadata = { title: 'پرداخت‌ها' };
export const dynamic = 'force-dynamic';

export default async function PaymentsPage() {
  const overviews = await getPayments();
  const pendingOfflineItemIds = new Set(
    overviews.flatMap(({ transactions }) =>
      transactions
        .filter(
          (transaction) =>
            transaction.paymentMethod === 'MANUAL_ADMIN_ENTRY' &&
            transaction.transactionStatus === 'CREATED',
        )
        .map((transaction) => transaction.paymentScheduleItemId),
    ),
  );
  const unpaid = overviews.flatMap(({ items, studentFirstName, studentLastName }) =>
    items
      .filter(({ id, itemStatus }) => itemStatus !== 'PAID' && !pendingOfflineItemIds.has(id))
      .map((item) => ({
        id: item.id,
        label: `${studentFirstName} ${studentLastName} — ${item.itemType === 'PREPAYMENT' ? 'پیش‌پرداخت' : `قسط ${item.sequenceNumber}`} — ${formatIrr(item.amount)}`,
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
                {overview.plan.planStatus}
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
                      {item.itemType === 'PREPAYMENT' ? 'پیش‌پرداخت' : `قسط ${item.sequenceNumber}`}
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
    </div>
  );
}
