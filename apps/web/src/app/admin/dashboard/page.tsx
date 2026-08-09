import {
  AlertTriangle,
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  ClipboardCheck,
  Clock,
  FileClock,
  ReceiptText,
  TrendingUp,
  WalletCards,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ButtonLink } from '@/components/ui/button';
import { getAdminDashboard } from '@/features/admin-dashboard/admin-dashboard-api';
import { formatPersianNumber } from '@/lib/formatters';
import { cn } from '@/lib/cn';

export const metadata = { title: 'داشبورد مدیریت' };

export default async function AdminDashboardPage() {
  const { summary, recentEnrollments } = await getAdminDashboard();

  const kpis = [
    {
      label: 'ثبت‌نام در انتظار',
      value: summary.pendingEnrollments,
      icon: ClipboardCheck,
      href: '/admin/registrations',
      trend: '+۲',
      trendUp: true,
      danger: false,
      color: 'from-primary/10 to-primary/5 border-primary/20',
      iconColor: 'text-primary',
    },
    {
      label: 'قرارداد منتظر پذیرش',
      value: summary.contractsAwaitingAcceptance,
      icon: FileClock,
      href: '/admin/contracts',
      trend: '+۱',
      trendUp: true,
      danger: false,
      color: 'from-sun/10 to-sun/5 border-sun/20',
      iconColor: 'text-sun',
    },
    {
      label: 'پرداخت آفلاین منتظر',
      value: summary.offlinePaymentsAwaitingReview,
      icon: ReceiptText,
      href: '/admin/payments',
      trend: '-۲',
      trendUp: false,
      danger: false,
      color: 'from-primary/10 to-primary/5 border-primary/20',
      iconColor: 'text-primary',
    },
    {
      label: 'پرداخت پیش‌رو',
      value: summary.upcomingPayments,
      icon: WalletCards,
      href: '/admin/payments',
      trend: '+۵',
      trendUp: true,
      danger: false,
      color: 'from-sun/10 to-sun/5 border-sun/20',
      iconColor: 'text-sun',
    },
    {
      label: 'اقساط سررسید گذشته',
      value: summary.overduePayments,
      icon: AlertTriangle,
      href: '/admin/payments',
      trend: '+۱',
      trendUp: false,
      danger: true,
      color: 'from-danger/10 to-danger/5 border-danger/20',
      iconColor: 'text-danger',
    },
  ] as const;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <TrendingUp aria-hidden="true" className="size-4 text-primary" />
            <p className="text-sm font-bold text-primary">نمای عملیاتی</p>
          </div>
          <h1 className="mt-1 text-2xl font-black sm:text-3xl">داشبورد مدیریت</h1>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted">
          <Clock aria-hidden="true" className="size-3.5" />
          <span>آخرین بروزرسانی: لحظاتی پیش</span>
        </div>
      </div>

      <section
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5"
        aria-label="شاخص‌های کلیدی عملیات"
      >
        {kpis.map(({ label, value, icon: Icon, href, trend, trendUp, color, iconColor }) => (
          <a
            key={label}
            href={href}
            className={cn(
              'group relative overflow-hidden rounded-[var(--radius-card)] border bg-gradient-to-br p-5 transition-all duration-[var(--duration-ui)] hover:shadow-[var(--shadow-floating)]',
              color,
            )}
          >
            <div className="flex items-start justify-between">
              <Icon aria-hidden="true" className={cn('size-5', iconColor)} />
              <span
                className={cn(
                  'inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold',
                  trendUp ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger',
                )}
              >
                {trendUp ? (
                  <ArrowUp aria-hidden="true" className="size-3" />
                ) : (
                  <ArrowDown aria-hidden="true" className="size-3" />
                )}
                {trend}
              </span>
            </div>
            <p className="mt-3 text-3xl font-black">{formatPersianNumber(value)}</p>
            <p className="mt-1 text-xs text-muted">{label}</p>
            <span className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-primary opacity-0 transition-opacity group-hover:opacity-100">
              مشاهده
              <ArrowLeft aria-hidden="true" className="size-3" />
            </span>
          </a>
        ))}
      </section>

      <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,360px)]">
        <section className="min-w-0 rounded-[var(--radius-card)] border border-border/60 bg-surface-paper p-5 shadow-[var(--shadow-raised)]">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <ClipboardCheck aria-hidden="true" className="size-4 text-primary" />
              <h2 className="font-black">ثبت‌نام‌های اخیر</h2>
            </div>
            <ButtonLink href="/admin/registrations" variant="ghost" size="sm">
              همه
            </ButtonLink>
          </div>
          <div className="grid gap-3 md:hidden" aria-label="ثبت‌نام‌های اخیر">
            {recentEnrollments.map((item) => (
              <article key={item.id} className="rounded-lg border border-border/50 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-bold">{item.studentName}</p>
                    <p className="mt-1 break-all text-xs text-muted" dir="ltr">
                      {item.trackingCode}
                    </p>
                  </div>
                  <Badge
                    tone={
                      item.status === 'نیازمند اصلاح'
                        ? 'danger'
                        : item.status === 'در انتظار قیمت'
                          ? 'warning'
                          : 'info'
                    }
                  >
                    {item.status}
                  </Badge>
                </div>
                <p className="mt-3 text-sm text-muted">
                  <span className="font-bold text-foreground">اقدام بعدی: </span>
                  {item.nextAction}
                </p>
              </article>
            ))}
          </div>
          <div
            className="hidden overflow-x-auto md:block"
            role="region"
            aria-label="جدول ثبت‌نام‌های اخیر"
            tabIndex={0}
          >
            <table className="w-full min-w-[36rem] text-right text-sm">
              <thead>
                <tr className="border-b border-border/50 text-muted text-[10px] uppercase tracking-wider">
                  <th className="px-3 py-3 font-bold">کد پیگیری</th>
                  <th className="px-3 py-3 font-bold">دانش‌آموز</th>
                  <th className="px-3 py-3 font-bold">وضعیت</th>
                  <th className="px-3 py-3 font-bold">اقدام بعدی</th>
                </tr>
              </thead>
              <tbody>
                {recentEnrollments.map((item) => (
                  <tr
                    key={item.id}
                    className="border-b border-border/30 last:border-0 hover:bg-surface-inset/50 transition-colors"
                  >
                    <td className="px-3 py-3.5 font-bold" dir="ltr">
                      {item.trackingCode}
                    </td>
                    <td className="px-3 py-3.5">{item.studentName}</td>
                    <td className="px-3 py-3.5">
                      <Badge
                        tone={
                          item.status === 'نیازمند اصلاح'
                            ? 'danger'
                            : item.status === 'در انتظار قیمت'
                              ? 'warning'
                              : 'info'
                        }
                      >
                        {item.status}
                      </Badge>
                    </td>
                    <td className="px-3 py-3.5 text-muted">{item.nextAction}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-[var(--radius-card)] border border-border/60 bg-surface-paper p-5 shadow-[var(--shadow-raised)]">
          <div className="flex items-center gap-2 mb-5">
            <AlertTriangle aria-hidden="true" className="size-4 text-danger" />
            <h2 className="font-black">نیازمند توجه</h2>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-lg bg-danger/5 p-3 border border-danger/10">
              <div>
                <p className="text-sm font-bold text-danger">
                  {formatPersianNumber(summary.overduePayments)} قسط سررسید گذشته
                </p>
                <p className="text-xs text-muted mt-0.5">نیازمند پیگیری فوری</p>
              </div>
              <ButtonLink
                href="/admin/payments"
                variant="ghost"
                size="sm"
                className="text-danger shrink-0"
              >
                مشاهده
              </ButtonLink>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-sun/5 p-3 border border-sun/10">
              <div>
                <p className="text-sm font-bold">
                  {formatPersianNumber(summary.pendingEnrollments)} ثبت‌نام در انتظار
                </p>
                <p className="text-xs text-muted mt-0.5">منتظر بررسی مدیریت</p>
              </div>
              <ButtonLink
                href="/admin/registrations"
                variant="ghost"
                size="sm"
                className="shrink-0"
              >
                مشاهده
              </ButtonLink>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-primary/5 p-3 border border-primary/10">
              <div>
                <p className="text-sm font-bold">
                  {formatPersianNumber(summary.contractsAwaitingAcceptance)} قرارداد منتظر پذیرش
                </p>
                <p className="text-xs text-muted mt-0.5">منتظر تأیید نهایی</p>
              </div>
              <ButtonLink href="/admin/contracts" variant="ghost" size="sm" className="shrink-0">
                مشاهده
              </ButtonLink>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-surface-inset p-3">
              <div>
                <p className="text-sm font-bold">
                  {formatPersianNumber(summary.offlinePaymentsAwaitingReview)} پرداخت آفلاین
                </p>
                <p className="text-xs text-muted mt-0.5">منتظر بررسی مدارک</p>
              </div>
              <ButtonLink href="/admin/payments" variant="ghost" size="sm" className="shrink-0">
                مشاهده
              </ButtonLink>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
