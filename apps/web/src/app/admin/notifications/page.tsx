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
  searchParams: Promise<{ page?: string }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? '1', 10) || 1);
  const list = await getAdminNotifications({ page, pageSize: 20 });
  const { items, total, totalPages: totalPagesRaw } = {
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
        {total > 0 && <p className="mt-1 text-xs text-muted">در مجموع {total} رویداد</p>}
      </div>
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
              <nav aria-label="صفحه‌بندی رویدادها" className="flex items-center justify-between gap-3">
                {page > 1 ? (
                  <ButtonLink
                    href={`/admin/notifications?page=${page - 1}`}
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
                  <ButtonLink href={`/admin/notifications?page=${page + 1}`} variant="secondary">
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
