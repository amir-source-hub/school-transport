import { Alert } from '@/components/feedback/alert';
import { Breadcrumbs } from '@/components/navigation/breadcrumbs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  demoOfflinePayments,
  getOfflineReviewTone,
} from '@/features/admin-payments/mock-admin-payments';
import { formatIrr } from '@/lib/formatters';

export const metadata = { title: 'پرداخت‌ها' };

export default function AdminPaymentsPage() {
  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[{ label: 'پنل مدیریت', href: '/admin/dashboard' }, { label: 'پرداخت‌ها' }]}
      />
      <div>
        <p className="text-sm font-bold text-primary">پایش مالی مدیریت</p>
        <h1 className="mt-1 text-2xl font-black sm:text-3xl">پرداخت‌ها</h1>
        <p className="mt-2 text-sm text-muted">
          صف زیر از داده mock ساخته شده و هیچ رکورد مالی واقعی را تغییر نمی‌دهد.
        </p>
      </div>

      <Alert tone="warning" title="اقدام مالی حساس غیرفعال است">
        تأیید یا رد باید با نقش مدیریت، کنترل مبلغ و فاکتور، جلوگیری از تکرار، ثبت یادداشت و نتیجه
        تراکنش اتمیک سرور انجام شود.
      </Alert>

      <section className="grid gap-4 sm:grid-cols-3" aria-label="خلاصه نمایشی پرداخت‌ها">
        <Card>
          <p className="text-sm text-muted">ارسال‌های نمایشی</p>
          <p className="mt-2 text-2xl font-black">۲</p>
        </Card>
        <Card>
          <p className="text-sm text-muted">در انتظار بررسی</p>
          <p className="mt-2 text-2xl font-black text-warning">۱</p>
        </Card>
        <Card>
          <p className="text-sm text-muted">تأییدشده نمایشی</p>
          <p className="mt-2 text-2xl font-black text-success">۱</p>
        </Card>
      </section>

      <div className="grid gap-4">
        {demoOfflinePayments.map((payment) => (
          <Card key={payment.id}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="font-black">{payment.student}</p>
                <p className="mt-1 text-sm text-muted">
                  {payment.family} — {payment.invoice}
                </p>
              </div>
              <Badge tone={getOfflineReviewTone(payment.status)}>{payment.status}</Badge>
            </div>
            <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <dt className="text-muted">مبلغ مورد انتظار</dt>
                <dd className="mt-1 font-bold">{formatIrr(payment.expectedAmount)}</dd>
              </div>
              <div>
                <dt className="text-muted">مبلغ ارسالی</dt>
                <dd className="mt-1 font-bold">{formatIrr(payment.submittedAmount)}</dd>
              </div>
              <div>
                <dt className="text-muted">شماره مرجع</dt>
                <dd className="mt-1 font-bold" dir="ltr">
                  {payment.reference}
                </dd>
              </div>
              <div>
                <dt className="text-muted">زمان پرداخت</dt>
                <dd className="mt-1 font-bold">{payment.paidAt}</dd>
              </div>
            </dl>
            {payment.status === 'در انتظار بررسی' && (
              <div className="mt-5 flex flex-wrap gap-2 border-t border-border pt-4">
                <Button disabled>تأیید پس از اتصال API</Button>
                <Button variant="secondary" disabled>
                  رد پس از اتصال API
                </Button>
                <p className="basis-full text-xs text-muted">
                  یادداشت مدیریت، تأیید نهایی و سابقه حسابرسی فقط از پاسخ معتبر سرور نمایش داده
                  می‌شوند.
                </p>
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
