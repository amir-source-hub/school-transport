import { Breadcrumbs } from '@/components/navigation/breadcrumbs';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { getAdminOfflineDestination, getAdminPayments, getPaymentTone } from '@/features/admin-payments/admin-payments-api';
import { OfflineDestinationForm } from '@/features/admin-payments/offline-destination-form';
import {
  ApprovePaymentDialog,
  ConfigureInstallmentsDialog,
  RejectPaymentDialog,
  ReceiptPreviewDialog,
} from '@/features/admin-payments/payment-actions';
import { formatIrr, formatJalaliDate, formatJalaliDateTime } from '@/lib/formatters';

export const metadata = { title: 'پرداخت‌ها' };
export const dynamic = 'force-dynamic';

export default async function AdminPaymentsPage() {
  const [{ payments }, destination] = await Promise.all([getAdminPayments(), getAdminOfflineDestination()]);
  const allItems = payments.flatMap((payment) => [payment.prepayment, ...payment.installments]);
  const awaitingReview = allItems.filter(
    (item) => item.transaction?.status === 'در انتظار بررسی',
  ).length;
  const approved = allItems.filter((item) => item.paid).length;

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[{ label: 'پنل مدیریت', href: '/admin/dashboard' }, { label: 'پرداخت‌ها' }]}
      />
      <div>
        <p className="text-sm font-bold text-primary">پایش مالی مدیریت</p>
        <h1 className="mt-1 text-2xl font-black sm:text-3xl">پرداخت‌ها</h1>
      </div>
      <section className="grid gap-4 sm:grid-cols-3" aria-label="خلاصه پرداخت‌ها">
        <Card>
          <p className="text-sm text-muted">دانش‌آموزان دارای پرداخت</p>
          <p className="mt-2 text-2xl font-black">{payments.length}</p>
        </Card>
        <Card>
          <p className="text-sm text-muted">در انتظار بررسی</p>
          <p className="mt-2 text-2xl font-black text-warning">{awaitingReview}</p>
        </Card>
        <Card>
          <p className="text-sm text-muted">تأییدشده</p>
          <p className="mt-2 text-2xl font-black text-success">{approved}</p>
        </Card>
      </section>
      <Card>
        <h2 className="mb-2 text-lg font-black">مقصد پرداخت آفلاین</h2>
        <p className="mb-5 text-sm text-muted">هر تغییر یک نسخه جدید ایجاد می‌کند و رسیدهای قبلی به نسخه مقصد زمان ارسال وابسته می‌مانند.</p>
        <OfflineDestinationForm current={destination} />
      </Card>
      <div className="grid gap-4">
        {payments.map((payment) => {
          const prepaymentStatus = payment.prepayment.transaction?.status ?? 'پرداخت نشده';
          const canConfigure =
            payment.prepayment.paid && !payment.planConfigured && payment.planType !== 'FULL';
          return (
            <Card key={payment.planId}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="font-black">{payment.studentName}</p>
                  <p className="mt-1 text-sm text-muted">
                    خانواده {payment.familyName} — مبلغ کل {formatIrr(payment.totalAmount)}
                  </p>
                </div>
                <Badge tone={payment.planStatus === 'COMPLETED' ? 'success' : 'neutral'}>
                  {payment.planStatus === 'COMPLETED' ? 'تسویه شده' : 'در حال پرداخت'}
                </Badge>
              </div>
              <section className="mt-5 rounded-xl border border-border bg-surface-muted/40 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <h3 className="font-black">پیش‌پرداخت</h3>
                  <Badge tone={getPaymentTone(prepaymentStatus)}>
                    {payment.prepayment.paid ? 'پرداخت شده' : prepaymentStatus}
                  </Badge>
                </div>
                <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <dt className="text-muted">مبلغ</dt>
                    <dd className="mt-1 font-bold">{formatIrr(payment.prepayment.amount)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted">مبلغ ثبت‌شده</dt>
                    <dd className="mt-1 font-bold">
                      {formatIrr(payment.prepayment.transaction?.submittedAmount ?? 0)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted">شماره مرجع</dt>
                    <dd className="mt-1 font-bold" dir="ltr">
                      {payment.prepayment.transaction?.reference ?? '—'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted">زمان ثبت</dt>
                    <dd className="mt-1 font-bold">
                      {payment.prepayment.transaction
                        ? formatJalaliDateTime(payment.prepayment.transaction.submittedAt)
                        : '—'}
                    </dd>
                  </div>
                </dl>
                {payment.prepayment.transaction?.destinationSnapshot && (
                  <div className="mt-4 rounded-xl bg-surface-muted p-3 text-sm leading-7">
                    مقصد نسخه {payment.prepayment.transaction.destinationSnapshot.version.toLocaleString('fa-IR')} — {payment.prepayment.transaction.destinationSnapshot.bankName} — <span dir="ltr">{payment.prepayment.transaction.destinationSnapshot.cardNumber}</span>
                    {payment.prepayment.transaction.sourceCardLastFour && <> · کارت مبدأ ****{payment.prepayment.transaction.sourceCardLastFour}</>}
                    {(payment.prepayment.transaction.previousAttempts ?? 0) > 0 && <> · تلاش‌های قبلی: {payment.prepayment.transaction.previousAttempts?.toLocaleString('fa-IR')}</>}
                  </div>
                )}
                {payment.prepayment.transaction?.status === 'در انتظار بررسی' && (
                  <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-4">
                    <ApprovePaymentDialog paymentId={payment.prepayment.transaction.id} version={payment.prepayment.transaction.version} />
                    <RejectPaymentDialog paymentId={payment.prepayment.transaction.id} version={payment.prepayment.transaction.version} />
                    <ReceiptPreviewDialog submissionId={payment.prepayment.transaction.id} />
                  </div>
                )}
                {canConfigure && (
                  <div className="mt-4 border-t border-border pt-4">
                    <ConfigureInstallmentsDialog planId={payment.planId} fullPayment={false} />
                  </div>
                )}
              </section>
              {payment.planConfigured && (
                <section className="mt-5 border-t border-border pt-5">
                  <h3 className="font-black">برنامه اقساط</h3>
                  <div className="mt-3 space-y-3">
                    {payment.installments.map((installment) => {
                      const transactionStatus = installment.transaction?.status ?? 'پرداخت نشده';
                      return (
                        <div key={installment.id} className="rounded-xl border border-border p-4">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <p className="font-bold">
                                قسط {installment.sequenceNumber.toLocaleString('fa-IR')}
                              </p>
                              <p className="mt-1 text-sm text-muted">
                                {formatIrr(installment.amount)} — سررسید{' '}
                                {installment.dueDate
                                  ? formatJalaliDate(installment.dueDate)
                                  : 'تعیین نشده'}
                              </p>
                            </div>
                            <Badge
                              tone={
                                installment.paid ? 'success' : getPaymentTone(transactionStatus)
                              }
                            >
                              {installment.paid ? 'پرداخت شده' : transactionStatus}
                            </Badge>
                          </div>
                          {installment.transaction && (
                            <div className="mt-3 text-sm text-muted">
                              <p>مرجع <span dir="ltr">{installment.transaction.reference}</span> — {formatJalaliDateTime(installment.transaction.submittedAt)}</p>
                              {installment.transaction.destinationSnapshot && <p className="mt-1">مقصد نسخه {installment.transaction.destinationSnapshot.version.toLocaleString('fa-IR')} — {installment.transaction.destinationSnapshot.bankName} — <span dir="ltr">{installment.transaction.destinationSnapshot.cardNumber}</span></p>}
                              {installment.transaction.sourceCardLastFour && <p className="mt-1">کارت مبدأ ****{installment.transaction.sourceCardLastFour}</p>}
                              {(installment.transaction.previousAttempts ?? 0) > 0 && <p className="mt-1">تلاش‌های قبلی: {installment.transaction.previousAttempts?.toLocaleString('fa-IR')}</p>}
                            </div>
                          )}
                          {installment.transaction?.status === 'در انتظار بررسی' && (
                            <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-4">
                              <ApprovePaymentDialog paymentId={installment.transaction.id} version={installment.transaction.version} />
                              <RejectPaymentDialog paymentId={installment.transaction.id} version={installment.transaction.version} />
                              <ReceiptPreviewDialog submissionId={installment.transaction.id} />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
