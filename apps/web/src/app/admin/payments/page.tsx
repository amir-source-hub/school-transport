import { Breadcrumbs } from '@/components/navigation/breadcrumbs';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { getAdminPayments, getPaymentTone } from '@/features/admin-payments/admin-payments-api';
import { ApprovePaymentDialog, RejectPaymentDialog } from '@/features/admin-payments/payment-actions';
import { formatIrr } from '@/lib/formatters';

export const metadata = { title: 'پرداخت‌ها' };
export const dynamic = 'force-dynamic';

export default async function AdminPaymentsPage() {
  const { payments } = await getAdminPayments();
  const awaitingReview = payments.filter((p) => p.status === 'در انتظار بررسی').length;
  const approved = payments.filter((p) => p.status === 'تأییدشده').length;

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: 'پنل مدیریت', href: '/admin/dashboard' }, { label: 'پرداخت‌ها' }]} />
      <div>
        <p className="text-sm font-bold text-primary">پایش مالی مدیریت</p>
        <h1 className="mt-1 text-2xl font-black sm:text-3xl">پرداخت‌ها</h1>
      </div>
      <section className="grid gap-4 sm:grid-cols-3" aria-label="خلاصه پرداخت‌ها">
        <Card>
          <p className="text-sm text-muted">کل تراکنش‌ها</p>
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
      <div className="grid gap-4">
        {payments.map((payment) => (
          <Card key={payment.id}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="font-black">{payment.studentName}</p>
                <p className="mt-1 text-sm text-muted">{payment.familyName} — {payment.invoice}</p>
              </div>
              <Badge tone={getPaymentTone(payment.status)}>{payment.status}</Badge>
            </div>
            <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
              <div><dt className="text-muted">مبلغ مورد انتظار</dt><dd className="mt-1 font-bold">{formatIrr(payment.expectedAmount)}</dd></div>
              <div><dt className="text-muted">مبلغ ارسالی</dt><dd className="mt-1 font-bold">{formatIrr(payment.submittedAmount)}</dd></div>
              <div><dt className="text-muted">شماره مرجع</dt><dd className="mt-1 font-bold" dir="ltr">{payment.reference}</dd></div>
              <div><dt className="text-muted">زمان پرداخت</dt><dd className="mt-1 font-bold">{payment.paidAt}</dd></div>
            </dl>
            {payment.status === 'در انتظار بررسی' && (
              <div className="mt-5 flex flex-wrap gap-2 border-t border-border pt-4">
                <ApprovePaymentDialog paymentId={payment.id} />
                <RejectPaymentDialog paymentId={payment.id} />
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
