import { AlertTriangle, ClipboardCheck, FileClock, ReceiptText, WalletCards } from 'lucide-react';

import { Breadcrumbs } from '@/components/navigation/breadcrumbs';
import { Badge } from '@/components/ui/badge';
import { ButtonLink } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { getAdminDashboard } from '@/features/admin-dashboard/admin-dashboard-api';
import { formatPersianNumber } from '@/lib/formatters';

export const metadata = { title: 'داشبورد مدیریت' };

export default async function AdminDashboardPage() {
  const { summary, recentEnrollments } = await getAdminDashboard();

  const metrics = [
    { label: 'ثبت‌نام‌های در انتظار', value: summary.pendingEnrollments, icon: ClipboardCheck, href: '/admin/registrations', danger: false },
    { label: 'قراردادهای منتظر پذیرش', value: summary.contractsAwaitingAcceptance, icon: FileClock, href: '/admin/contracts', danger: false },
    { label: 'پرداخت آفلاین منتظر بررسی', value: summary.offlinePaymentsAwaitingReview, icon: ReceiptText, href: '/admin/payments', danger: false },
    { label: 'پرداخت‌های پیش‌رو', value: summary.upcomingPayments, icon: WalletCards, href: '/admin/payments', danger: false },
    { label: 'اقساط سررسید گذشته', value: summary.overduePayments, icon: AlertTriangle, href: '/admin/payments', danger: true },
  ] as const;

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: 'پنل مدیریت', href: '/admin/dashboard' }, { label: 'داشبورد' }]} />
      <div>
        <p className="text-sm font-bold text-primary">نمای عملیاتی</p>
        <h1 className="mt-1 text-2xl font-black sm:text-3xl">داشبورد مدیریت</h1>
      </div>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5" aria-label="خلاصه عملیات مدیریت">
        {metrics.map(({ label, value, icon: Icon, href, ...metric }) => (
          <Card key={label} className={metric.danger ? 'border-danger/25' : ''}>
            <Icon aria-hidden="true" className={`size-6 ${metric.danger ? 'text-danger' : 'text-primary'}`} />
            <p className="mt-4 text-3xl font-black">{formatPersianNumber(value)}</p>
            <p className="mt-1 text-sm text-muted">{label}</p>
            <ButtonLink href={href} variant="ghost" className="mt-3 min-h-10 px-0">مشاهده موارد</ButtonLink>
          </Card>
        ))}
      </section>
      <Card>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-black">ثبت‌نام‌های اخیر</h2>
          </div>
          <ButtonLink href="/admin/registrations" variant="secondary">همه درخواست‌ها</ButtonLink>
        </div>
        <div className="mt-5 overflow-x-auto" role="region" aria-label="جدول ثبت‌نام‌های اخیر" tabIndex={0}>
          <table className="w-full min-w-[42rem] text-right text-sm">
            <thead>
              <tr className="border-b border-border text-muted">
                <th className="px-3 py-3">کد پیگیری</th>
                <th className="px-3 py-3">دانش‌آموز</th>
                <th className="px-3 py-3">وضعیت</th>
                <th className="px-3 py-3">اقدام بعدی</th>
              </tr>
            </thead>
            <tbody>
              {recentEnrollments.map((item) => (
                <tr key={item.trackingCode} className="border-b border-border last:border-0">
                  <td className="px-3 py-3 font-bold" dir="ltr">{item.trackingCode}</td>
                  <td className="px-3 py-3">{item.studentName}</td>
                  <td className="px-3 py-3"><Badge tone={item.status === 'نیازمند اصلاح' ? 'danger' : 'warning'}>{item.status}</Badge></td>
                  <td className="px-3 py-3">{item.nextAction}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
