import { notFound } from 'next/navigation';

import { Alert } from '@/components/feedback/alert';
import { Breadcrumbs } from '@/components/navigation/breadcrumbs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { demoContract, demoInvoices } from '@/features/finance/mock-finance';
import { formatIrr } from '@/lib/formatters';

export const generateStaticParams = () => [{ contractId: demoContract.id }];

export default async function ContractPage({
  params,
}: {
  params: Promise<{ contractId: string }>;
}) {
  const { contractId } = await params;
  if (contractId !== demoContract.id) notFound();

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: 'پنل خانواده', href: '/parent/dashboard' },
          { label: 'قراردادها', href: '/parent/contracts' },
          { label: demoContract.number },
        ]}
      />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-bold text-primary">{demoContract.version}</p>
          <h1 className="mt-1 text-2xl font-black sm:text-3xl">{demoContract.number}</h1>
          <p className="mt-2 text-sm text-muted">قرارداد مربوط به {demoContract.studentName}</p>
        </div>
        <Badge tone="warning">{demoContract.status}</Badge>
      </div>
      <Alert tone="warning" title="قرارداد نمایشی و غیرقابل پذیرش">
        متن، فایل PDF، OTP و پذیرش نهایی باید از نسخه جاری و تأییدشده سرور دریافت شوند؛ بنابراین
        اقدام پذیرش در حالت mock غیرفعال است.
      </Alert>
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4" aria-label="خلاصه قرارداد">
        <Card>
          <p className="text-sm text-muted">دوره خدمت</p>
          <p className="mt-2 font-black">{demoContract.servicePeriod}</p>
        </Card>
        <Card>
          <p className="text-sm text-muted">قیمت توافقی نمایشی</p>
          <p className="mt-2 font-black">{formatIrr(demoContract.totalPrice)}</p>
        </Card>
        <Card>
          <p className="text-sm text-muted">روش پرداخت</p>
          <p className="mt-2 font-black">{demoContract.paymentMethod}</p>
        </Card>
        <Card>
          <p className="text-sm text-muted">مانده نمایشی</p>
          <p className="mt-2 font-black">{formatIrr(demoContract.remainingAmount)}</p>
        </Card>
      </section>
      <Card>
        <h2 className="text-lg font-black">برنامه پرداخت بازگشتی از mock</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[40rem] text-right text-sm">
            <thead>
              <tr className="border-b border-border text-muted">
                <th className="px-3 py-3">عنوان</th>
                <th className="px-3 py-3">مبلغ</th>
                <th className="px-3 py-3">سررسید</th>
                <th className="px-3 py-3">وضعیت</th>
              </tr>
            </thead>
            <tbody>
              {demoInvoices.map((invoice) => (
                <tr key={invoice.id} className="border-b border-border last:border-0">
                  <td className="px-3 py-3 font-bold">{invoice.title}</td>
                  <td className="px-3 py-3">{formatIrr(invoice.amount)}</td>
                  <td className="px-3 py-3">{invoice.dueDate}</td>
                  <td className="px-3 py-3">
                    <Badge tone={invoice.status === 'پرداخت‌شده' ? 'success' : 'warning'}>
                      {invoice.status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <Card>
        <h2 className="text-lg font-black">متن و شرایط قرارداد</h2>
        <p className="mt-3 text-sm text-muted">
          متن کامل و تغییرناپذیر قرارداد از snapshot نسخه جاری سرور در این بخش نمایش داده خواهد شد.
          هیچ شرط قراردادی در فرانت‌اند ساخته نمی‌شود.
        </p>
      </Card>
      <div className="flex justify-end">
        <Button disabled>پذیرش با تأیید و OTP</Button>
      </div>
    </div>
  );
}
