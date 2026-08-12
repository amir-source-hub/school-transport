import { Breadcrumbs } from '@/components/navigation/breadcrumbs';
import Link from 'next/link';
import { ButtonLink } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import {
  getAdminOfflineDestination,
  getAdminOfflineSubmissions,
  getAdminPayments,
  getPaymentTone,
} from '@/features/admin-payments/admin-payments-api';
import { OfflineDestinationForm } from '@/features/admin-payments/offline-destination-form';
import {
  ApprovePaymentDialog,
  ConfigureInstallmentsDialog,
  RejectPaymentDialog,
  ReceiptPreviewDialog,
  RecordPaymentOnBehalfDialog,
} from '@/features/admin-payments/payment-actions';
import { formatIrr, formatJalaliDate, formatJalaliDateTime } from '@/lib/formatters';

export const metadata = { title: 'پرداخت‌ها' };
export const dynamic = 'force-dynamic';

export default async function AdminPaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ receiptStatus?: string; itemType?: string; receiptPage?: string }>;
}) {
  const params = await searchParams;
  const receiptPage = Math.max(1, Number.parseInt(params.receiptPage ?? '1', 10) || 1);
  const receiptStatus = ['PENDING_REVIEW', 'APPROVED', 'REJECTED'].includes(
    params.receiptStatus ?? '',
  )
    ? params.receiptStatus
    : undefined;
  const itemType = ['PREPAYMENT', 'INSTALLMENT'].includes(params.itemType ?? '')
    ? params.itemType
    : undefined;
  const receiptFilters = {
    status: receiptStatus,
    itemType,
  };
  const [{ payments }, destination, submissions] = await Promise.all([
    getAdminPayments(),
    getAdminOfflineDestination(),
    getAdminOfflineSubmissions({ ...receiptFilters, page: receiptPage, pageSize: 20 }),
  ]);
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
        <p className="mb-5 text-sm text-muted">
          هر تغییر یک نسخه جدید ایجاد می‌کند و رسیدهای قبلی به نسخه مقصد زمان ارسال وابسته می‌مانند.
        </p>
        <OfflineDestinationForm current={destination} />
      </Card>
      <section className="space-y-4" aria-labelledby="receipt-review-heading">
        <div>
          <h2 id="receipt-review-heading" className="text-xl font-black">
            صف بررسی رسیدها
          </h2>
          <p className="mt-1 text-sm text-muted">
            {submissions.total.toLocaleString('fa-IR')} رسید مطابق پالایش فعلی
          </p>
        </div>
        <Card>
          <form className="grid gap-3 sm:grid-cols-3" aria-label="پالایش رسیدهای پرداخت">
            <label className="text-sm font-bold">
              وضعیت
              <select
                name="receiptStatus"
                defaultValue={receiptFilters.status ?? ''}
                className="mt-2 min-h-11 w-full rounded-xl border border-border bg-white px-3"
              >
                <option value="">همه وضعیت‌ها</option>
                <option value="PENDING_REVIEW">در انتظار بررسی</option>
                <option value="APPROVED">تأییدشده</option>
                <option value="REJECTED">نیازمند اصلاح</option>
              </select>
            </label>
            <label className="text-sm font-bold">
              نوع پرداخت
              <select
                name="itemType"
                defaultValue={receiptFilters.itemType ?? ''}
                className="mt-2 min-h-11 w-full rounded-xl border border-border bg-white px-3"
              >
                <option value="">همه</option>
                <option value="PREPAYMENT">پیش‌پرداخت</option>
                <option value="INSTALLMENT">قسط</option>
              </select>
            </label>
            <div className="flex items-end gap-2">
              <button
                type="submit"
                className="min-h-11 rounded-xl bg-primary px-4 text-sm font-bold text-white"
              >
                اعمال
              </button>
              <Link
                href="/admin/payments"
                className="min-h-11 rounded-xl border border-border px-4 py-2.5 text-sm font-bold"
              >
                پاک‌کردن
              </Link>
            </div>
          </form>
        </Card>
        {submissions.items.length === 0 ? (
          <Card>
            <p className="text-center text-sm text-muted">رسیدی مطابق این پالایش وجود ندارد.</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {submissions.items.map((submission) => (
              <Card key={submission.id} variant="outlined">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="break-words font-black">{submission.studentName}</p>
                    <p className="mt-1 text-sm text-muted">خانواده {submission.familyName}</p>
                  </div>
                  <Badge
                    tone={
                      submission.status === 'APPROVED'
                        ? 'success'
                        : submission.status === 'REJECTED'
                          ? 'danger'
                          : 'warning'
                    }
                  >
                    {submission.status === 'APPROVED'
                      ? 'تأییدشده'
                      : submission.status === 'REJECTED'
                        ? 'نیازمند اصلاح'
                        : 'در انتظار بررسی'}
                  </Badge>
                </div>
                <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <dt className="text-muted">نوع</dt>
                    <dd className="mt-1 font-bold">
                      {submission.itemType === 'PREPAYMENT'
                        ? 'پیش‌پرداخت'
                        : `قسط ${submission.sequenceNumber.toLocaleString('fa-IR')}`}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted">مبلغ مورد انتظار / ارسالی</dt>
                    <dd className="mt-1 font-bold">
                      {formatIrr(submission.expectedAmount)} /{' '}
                      {formatIrr(submission.submittedAmount)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted">تاریخ پرداخت</dt>
                    <dd className="mt-1 font-bold">{formatJalaliDate(submission.paidAt)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted">مرجع</dt>
                    <dd className="mt-1 break-all font-bold" dir="ltr">
                      {submission.referenceNumber}
                    </dd>
                  </div>
                </dl>
                <p className="mt-3 text-sm text-muted">
                  مقصد نسخه {submission.destinationSnapshot.version.toLocaleString('fa-IR')} —{' '}
                  {submission.destinationSnapshot.bankName}
                </p>
                {submission.rejectionReason && (
                  <p className="mt-3 rounded-xl bg-danger/5 p-3 text-sm text-danger">
                    دلیل: {submission.rejectionReason}
                  </p>
                )}
                <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-4">
                  <ReceiptPreviewDialog submissionId={submission.id} />
                  {submission.status === 'PENDING_REVIEW' && (
                    <>
                      <ApprovePaymentDialog
                        paymentId={submission.id}
                        version={submission.version}
                      />
                      <RejectPaymentDialog paymentId={submission.id} version={submission.version} />
                    </>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
        <nav
          aria-label="صفحه‌بندی رسیدهای پرداخت"
          className="flex items-center justify-between gap-3"
        >
          {receiptPage > 1 ? (
            <ButtonLink
              variant="secondary"
              href={`/admin/payments?${new URLSearchParams({ ...(receiptFilters.status ? { receiptStatus: receiptFilters.status } : {}), ...(receiptFilters.itemType ? { itemType: receiptFilters.itemType } : {}), receiptPage: String(receiptPage - 1) })}`}
            >
              قبلی
            </ButtonLink>
          ) : (
            <span />
          )}
          <span className="text-xs text-muted">صفحه {receiptPage.toLocaleString('fa-IR')}</span>
          {receiptPage * submissions.pageSize < submissions.total ? (
            <ButtonLink
              variant="secondary"
              href={`/admin/payments?${new URLSearchParams({ ...(receiptFilters.status ? { receiptStatus: receiptFilters.status } : {}), ...(receiptFilters.itemType ? { itemType: receiptFilters.itemType } : {}), receiptPage: String(receiptPage + 1) })}`}
            >
              بعدی
            </ButtonLink>
          ) : (
            <span />
          )}
        </nav>
      </section>
      <section className="space-y-3" aria-labelledby="payment-plan-summary-heading">
        <div>
          <h2 id="payment-plan-summary-heading" className="text-xl font-black">
            خلاصه برنامه‌های پرداخت خانواده‌ها
          </h2>
          <p className="mt-1 text-sm text-muted">
            این بخش خلاصه همان برنامه مالی است؛ رسیدهای نیازمند اقدام فقط در صف بررسی بالا نمایش
            داده می‌شوند.
          </p>
        </div>
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
                      مقصد نسخه{' '}
                      {payment.prepayment.transaction.destinationSnapshot.version.toLocaleString(
                        'fa-IR',
                      )}{' '}
                      — {payment.prepayment.transaction.destinationSnapshot.bankName} —{' '}
                      <span dir="ltr">
                        {payment.prepayment.transaction.destinationSnapshot.cardNumber}
                      </span>
                      {payment.prepayment.transaction.sourceCardLastFour && (
                        <> · کارت مبدأ ****{payment.prepayment.transaction.sourceCardLastFour}</>
                      )}
                      {(payment.prepayment.transaction.previousAttempts ?? 0) > 0 && (
                        <>
                          {' '}
                          · تلاش‌های قبلی:{' '}
                          {payment.prepayment.transaction.previousAttempts?.toLocaleString('fa-IR')}
                        </>
                      )}
                    </div>
                  )}
                  {!payment.prepayment.paid &&
                    payment.prepayment.transaction?.status !== 'در انتظار بررسی' && (
                      <div className="mt-4 border-t border-border pt-4">
                        <RecordPaymentOnBehalfDialog
                          scheduleItemId={payment.prepayment.id}
                          label="پیش‌پرداخت"
                        />
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
                                <p>
                                  مرجع <span dir="ltr">{installment.transaction.reference}</span> —{' '}
                                  {formatJalaliDateTime(installment.transaction.submittedAt)}
                                </p>
                                {installment.transaction.destinationSnapshot && (
                                  <p className="mt-1">
                                    مقصد نسخه{' '}
                                    {installment.transaction.destinationSnapshot.version.toLocaleString(
                                      'fa-IR',
                                    )}{' '}
                                    — {installment.transaction.destinationSnapshot.bankName} —{' '}
                                    <span dir="ltr">
                                      {installment.transaction.destinationSnapshot.cardNumber}
                                    </span>
                                  </p>
                                )}
                                {installment.transaction.sourceCardLastFour && (
                                  <p className="mt-1">
                                    کارت مبدأ ****{installment.transaction.sourceCardLastFour}
                                  </p>
                                )}
                                {(installment.transaction.previousAttempts ?? 0) > 0 && (
                                  <p className="mt-1">
                                    تلاش‌های قبلی:{' '}
                                    {installment.transaction.previousAttempts?.toLocaleString(
                                      'fa-IR',
                                    )}
                                  </p>
                                )}
                              </div>
                            )}
                            {!installment.paid &&
                              installment.transaction?.status !== 'در انتظار بررسی' && (
                                <div className="mt-4 border-t border-border pt-4">
                                  <RecordPaymentOnBehalfDialog
                                    scheduleItemId={installment.id}
                                    label={`قسط ${installment.sequenceNumber.toLocaleString('fa-IR')}`}
                                  />
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
      </section>
    </div>
  );
}
