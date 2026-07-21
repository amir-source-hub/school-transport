import { Alert } from '@/components/feedback/alert';
import { Breadcrumbs } from '@/components/navigation/breadcrumbs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { demoContract, demoInvoices, demoPaymentOverview } from '@/features/finance/mock-finance';
import { OfflinePaymentForm } from '@/features/finance/offline-payment-form';
import { PaymentReturnPreview } from '@/features/finance/payment-return-preview';
import { getFinanceStatusTone } from '@/features/finance/status';
import { formatIrr } from '@/lib/formatters';

export const metadata = { title: 'پرداخت‌ها' };

export default function PaymentsPage() {
  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[{ label: 'پنل خانواده', href: '/parent/dashboard' }, { label: 'پرداخت‌ها' }]}
      />
      <div>
        <p className="text-sm font-bold text-primary">{demoPaymentOverview.studentName}</p>
        <h1 className="mt-1 text-2xl font-black sm:text-3xl">پرداخت‌ها و اقساط</h1>
        <p className="mt-2 text-sm text-muted">
          مبالغ و وضعیت‌های این صفحه مستقیماً از آداپتور mock نمایش داده می‌شوند.
        </p>
      </div>
      <Alert tone="warning" title="در زمان بررسی دوباره پرداخت نکنید">
        موفقیت پرداخت فقط پس از تأیید قطعی سرور نمایش داده می‌شود. اگر وضعیت یک تراکنش نامشخص یا در
        انتظار بررسی است، پرداخت دوباره می‌تواند خطر پرداخت تکراری داشته باشد.
      </Alert>
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4" aria-label="خلاصه پرداخت">
        <Card>
          <p className="text-sm text-muted">قیمت کل قرارداد</p>
          <p className="mt-2 font-black">{formatIrr(demoContract.totalPrice)}</p>
        </Card>
        <Card>
          <p className="text-sm text-muted">پرداخت‌شده و تأییدشده</p>
          <p className="mt-2 font-black text-success">
            {formatIrr(demoPaymentOverview.paidAmount)}
          </p>
        </Card>
        <Card>
          <p className="text-sm text-muted">مانده</p>
          <p className="mt-2 font-black">{formatIrr(demoPaymentOverview.remainingAmount)}</p>
        </Card>
        <Card>
          <p className="text-sm text-muted">وضعیت برنامه</p>
          <div className="mt-2">
            <Badge tone={getFinanceStatusTone(demoPaymentOverview.planStatus)}>
              {demoPaymentOverview.planStatus}
            </Badge>
          </div>
        </Card>
      </section>
      <Card>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-black">برنامه پیش‌پرداخت و چهار قسط</h2>
            <p className="mt-1 text-sm text-muted">
              پرداخت بعدی: {demoPaymentOverview.nextPayment}
            </p>
          </div>
          <Button disabled>شروع پرداخت پس از اتصال درگاه</Button>
        </div>
        <div className="mt-5 grid gap-3">
          {demoInvoices.map((invoice) => (
            <div
              key={invoice.id}
              className="grid gap-2 rounded-[var(--radius-sm)] border border-border p-4 sm:grid-cols-[1fr_auto_auto] sm:items-center"
            >
              <div>
                <p className="font-bold">{invoice.title}</p>
                <p className="text-sm text-muted">{invoice.dueDate}</p>
              </div>
              <p className="font-bold">{formatIrr(invoice.amount)}</p>
              <Badge tone={getFinanceStatusTone(invoice.status)}>{invoice.status}</Badge>
            </div>
          ))}
        </div>
      </Card>
      <Card>
        <PaymentReturnPreview />
      </Card>
      <Card>
        <div className="mb-5">
          <h2 className="text-lg font-black">ثبت جزئیات پرداخت آفلاین</h2>
          <p className="mt-1 text-sm text-muted">
            اطلاعات پرداخت برای بررسی مدیریت ثبت می‌شود و به‌تنهایی پرداخت را تأیید نمی‌کند.
          </p>
        </div>
        <OfflinePaymentForm />
      </Card>
      <Card>
        <h2 className="text-lg font-black">پرداخت آفلاین و سابقه بررسی</h2>
        <div className="mt-4 space-y-3">
          {demoPaymentOverview.offlineSubmissions.map((submission) => (
            <div
              key={submission.id}
              className="rounded-[var(--radius-sm)] bg-surface-muted p-4 text-sm"
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="font-bold">
                  {submission.invoice} — {formatIrr(submission.amount)}
                </p>
                <Badge tone="warning">{submission.status}</Badge>
              </div>
              <p className="mt-2 text-muted">شماره مرجع: {submission.reference}</p>
            </div>
          ))}
        </div>
        <p className="mt-4 text-sm text-muted">
          ارسال رسید، نمایش دلیل رد و ارسال مجدد پس از تأیید قرارداد آپلود و API فعال می‌شود.
        </p>
      </Card>
    </div>
  );
}
