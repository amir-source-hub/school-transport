import Link from 'next/link';
import { Suspense } from 'react';
import { Breadcrumbs } from '@/components/navigation/breadcrumbs';
import { Badge } from '@/components/ui/badge';
import { ButtonLink } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  getAdminNotifications,
  type AdminNotification,
} from '@/features/admin-notifications/admin-notifications-api';
import { formatJalaliDateTime } from '@/lib/formatters';

export const metadata = { title: 'اعلان‌ها' };

const statusTone: Record<string, 'info' | 'warning' | 'success' | 'danger' | 'neutral'> = {
  SENT: 'success',
  PENDING: 'warning',
  FAILED: 'danger',
};

function StatusLabel({ item }: { item: AdminNotification }) {
  const status = item.notificationStatus;
  const label =
    status === 'SENT'
      ? 'ارسال‌شده'
      : status === 'PENDING'
        ? 'در انتظار'
        : status === 'FAILED'
          ? 'ناموفق'
          : status;
  return <Badge tone={statusTone[status] ?? 'neutral'}>{label}</Badge>;
}

function AdminNotificationsSkeleton() {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="در حال بارگذاری رویدادهای عملیاتی">
      {[1, 2, 3].map((item) => (
        <Card key={item} padding="md">
          <div className="h-4 w-1/3 animate-pulse rounded bg-surface-muted" />
          <div className="mt-2 h-3 w-2/3 animate-pulse rounded bg-surface-muted" />
        </Card>
      ))}
    </div>
  );
}

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    type?: string;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
  }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? '1', 10) || 1);
  const filters = {
    type: params.type || undefined,
    status: params.status || undefined,
    dateFrom: params.dateFrom || undefined,
    dateTo: params.dateTo || undefined,
  };
  const list = await getAdminNotifications({ page, pageSize: 20, ...filters });
  const {
    items,
    total,
    totalPages: totalPagesRaw,
  } = {
    items: list.items,
    total: list.total,
    totalPages: Math.ceil(list.total / list.pageSize),
  };
  const totalPages = Math.max(1, totalPagesRaw);

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[{ label: 'پنل مدیریت', href: '/admin/dashboard' }, { label: 'اعلان‌ها' }]}
      />
      <div>
        <p className="text-sm font-bold text-primary">رویدادهای عملیاتی</p>
        <h1 className="mt-1 text-2xl font-black sm:text-3xl">اعلان‌ها</h1>
        <p className="mt-1 text-xs text-muted">
          پیش‌فرض این صف رویدادهای ۳۰ روز گذشته است؛ برای بازه دیگر از پالایش تاریخ استفاده کنید.
        </p>
        {total > 0 && <p className="mt-1 text-xs text-muted">در مجموع {total} رویداد</p>}
      </div>
      <Card padding="md">
        <form className="grid gap-3 md:grid-cols-5" aria-label="پالایش رویدادهای عملیاتی">
          <label className="text-sm font-bold">
            نوع
            <select
              name="type"
              defaultValue={filters.type ?? ''}
              className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2"
            >
              <option value="">همه نوع‌ها</option>
              <option value="LIMIT_REQUEST_CREATED">درخواست افزایش ظرفیت</option>
              <option value="ENROLLMENT_CREATED">ثبت‌نام جدید</option>
              <option value="PRICE_OFFERED">قیمت‌گذاری</option>
              <option value="PAYMENT_APPROVED">پرداخت</option>
              <option value="CONTRACT_READY">قرارداد</option>
            </select>
          </label>
          <label className="text-sm font-bold">
            وضعیت
            <select
              name="status"
              defaultValue={filters.status ?? ''}
              className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2"
            >
              <option value="">همه وضعیت‌ها</option>
              <option value="PENDING">در انتظار</option>
              <option value="SENT">ارسال‌شده</option>
              <option value="FAILED">ناموفق</option>
            </select>
          </label>
          <label className="text-sm font-bold">
            از تاریخ
            <input
              name="dateFrom"
              type="date"
              defaultValue={filters.dateFrom ?? ''}
              className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2"
            />
          </label>
          <label className="text-sm font-bold">
            تا تاریخ
            <input
              name="dateTo"
              type="date"
              defaultValue={filters.dateTo ?? ''}
              className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2"
            />
          </label>
          <div className="flex items-end gap-2">
            <button
              className="rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white"
              type="submit"
            >
              اعمال
            </button>
            <Link
              href="/admin/notifications"
              className="rounded-xl border border-border px-4 py-2 text-sm font-bold"
            >
              پاک‌کردن
            </Link>
          </div>
        </form>
      </Card>
      <Suspense fallback={<AdminNotificationsSkeleton />}>
        {items.length === 0 ? (
          <Card padding="md">
            <p className="text-center text-sm text-muted">
              رویداد عملیاتی در انتظار در این بخش نمایش داده می‌شود.
            </p>
          </Card>
        ) : (
          <div className="space-y-3">
            {items.map((notif) => (
              <Card key={notif.id} variant="outlined" padding="md">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <p className="font-black">{notif.title}</p>
                    <StatusLabel item={notif} />
                  </div>
                  <p className="text-xs text-muted">{formatJalaliDateTime(notif.eventTime)}</p>
                </div>
                <p className="mt-2 text-sm text-muted">{notif.message}</p>
                {notif.route && (
                  <Link
                    href={notif.route}
                    className="mt-2 inline-block text-xs font-bold text-primary hover:underline"
                  >
                    مشاهده در بخش مدیریت
                  </Link>
                )}
              </Card>
            ))}
            {totalPages > 1 && (
              <nav
                aria-label="صفحه‌بندی رویدادها"
                className="flex items-center justify-between gap-3"
              >
                {page > 1 ? (
                  <ButtonLink
                    href={`/admin/notifications?${new URLSearchParams({ ...Object.fromEntries(Object.entries(filters).filter(([, value]) => value)), page: String(page - 1) }).toString()}`}
                    variant="secondary"
                  >
                    قبلی
                  </ButtonLink>
                ) : (
                  <span />
                )}
                <span className="text-xs text-muted">
                  صفحه {page} از {totalPages}
                </span>
                {page < totalPages ? (
                  <ButtonLink
                    href={`/admin/notifications?${new URLSearchParams({ ...Object.fromEntries(Object.entries(filters).filter(([, value]) => value)), page: String(page + 1) }).toString()}`}
                    variant="secondary"
                  >
                    بعدی
                  </ButtonLink>
                ) : (
                  <span />
                )}
              </nav>
            )}
          </div>
        )}
      </Suspense>
    </div>
  );
}
