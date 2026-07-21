import { AlertTriangle, ClipboardCheck, FileClock, ReceiptText, WalletCards } from 'lucide-react';

import { Breadcrumbs } from '@/components/navigation/breadcrumbs';
import { Badge } from '@/components/ui/badge';
import { ButtonLink } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  demoAdminSummary,
  demoRecentEnrollments,
} from '@/features/admin-dashboard/mock-admin-dashboard';
import { formatPersianNumber } from '@/lib/formatters';

const metrics = [
  {
    label: 'ثبت‌نام‌های در انتظار',
    value: demoAdminSummary.pendingEnrollments,
    icon: ClipboardCheck,
    href: '/admin/registrations',
    danger: false,
  },
  {
    label: 'قراردادهای منتظر پذیرش',
    value: demoAdminSummary.contractsAwaitingAcceptance,
    icon: FileClock,
    href: '/admin/contracts',
    danger: false,
  },
  {
    label: 'پرداخت آفلاین منتظر بررسی',
    value: demoAdminSummary.offlinePaymentsAwaitingReview,
    icon: ReceiptText,
    href: '/admin/payments',
    danger: false,
  },
  {
    label: 'پرداخت‌های پیش‌رو',
    value: demoAdminSummary.upcomingPayments,
    icon: WalletCards,
    href: '/admin/payments',
    danger: false,
  },
  {
    label: 'اقساط سررسید گذشته',
    value: demoAdminSummary.overduePayments,
    icon: AlertTriangle,
    href: '/admin/payments',
    danger: true,
  },
] as const;

export const metadata = { title: 'داشبورد مدیریت' };

export default function AdminDashboardPage() {
  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[{ label: 'پنل مدیریت', href: '/admin/dashboard' }, { label: 'داشبورد' }]}
      />
      <div>
        <p className="text-sm font-bold text-primary">نمای عملیاتی</p>
        <h1 className="mt-1 text-2xl font-black sm:text-3xl">داشبورد مدیریت</h1>
        <p className="mt-2 text-sm text-muted">
          اعداد این صفحه از پاسخ نمونه مستند API نمایش داده می‌شوند.
        </p>
      </div>
      <section
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5"
        aria-label="خلاصه عملیات مدیریت"
      >
        {metrics.map(({ label, value, icon: Icon, href, ...metric }) => (
          <Card key={label} className={metric.danger ? 'border-danger/25' : ''}>
            <Icon
              aria-hidden="true"
              className={`size-6 ${metric.danger ? 'text-danger' : 'text-primary'}`}
            />
            <p className="mt-4 text-3xl font-black">{formatPersianNumber(value)}</p>
            <p className="mt-1 text-sm text-muted">{label}</p>
            <ButtonLink href={href} variant="ghost" className="mt-3 min-h-10 px-0">
              مشاهده موارد
            </ButtonLink>
          </Card>
        ))}
      </section>
      <Card>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-black">ثبت‌نام‌های اخیر نمایشی</h2>
            <p className="mt-1 text-sm text-muted">
              برای اقدام واقعی باید نسخه و وضعیت جاری رکورد از سرور بررسی شود.
            </p>
          </div>
          <ButtonLink href="/admin/registrations" variant="secondary">
            همه درخواست‌ها
          </ButtonLink>
        </div>
        <div
          className="mt-5 overflow-x-auto"
          role="region"
          aria-label="جدول ثبت‌نام‌های اخیر"
          tabIndex={0}
        >
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
              {demoRecentEnrollments.map((item) => (
                <tr key={item.trackingCode} className="border-b border-border last:border-0">
                  <td className="px-3 py-3 font-bold">{item.trackingCode}</td>
                  <td className="px-3 py-3">{item.student}</td>
                  <td className="px-3 py-3">
                    <Badge tone={item.status === 'نیازمند اصلاح' ? 'danger' : 'warning'}>
                      {item.status}
                    </Badge>
                  </td>
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
