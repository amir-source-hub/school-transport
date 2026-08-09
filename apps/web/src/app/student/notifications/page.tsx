import Link from 'next/link';
import { Breadcrumbs } from '@/components/navigation/breadcrumbs';
import { Badge } from '@/components/ui/badge';
import { ButtonLink } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { MarkAllReadButton, MarkReadButton } from '@/features/notifications/notification-actions';
import { getNotifications } from '@/features/notifications/notifications-api';
import { formatJalaliDateTime } from '@/lib/formatters';
import { NotificationSettingsForm } from '@/features/notifications/notification-settings-form';
import { getNotificationSettings } from '@/features/notifications/notifications-api';
import { Suspense } from 'react';

export const metadata = { title: 'اعلان‌ها' };
export const dynamic = 'force-dynamic';

function NotificationsSkeleton() {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="در حال بارگذاری اعلان‌ها">
      {[1, 2, 3].map((item) => (
        <Card key={item} padding="md">
          <div className="space-y-2">
            <div className="h-4 w-1/3 animate-pulse rounded bg-surface-muted" />
            <div className="h-3 w-2/3 animate-pulse rounded bg-surface-muted" />
            <div className="h-3 w-1/4 animate-pulse rounded bg-surface-muted" />
          </div>
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
  const [list, settings] = await Promise.all([getNotifications(page), getNotificationSettings()]);
  const { items, total, pageSize } = list;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[{ label: 'پنل دانش‌آموز', href: '/student/dashboard' }, { label: 'اعلان‌ها' }]}
      />
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-primary">پیام‌های حساب</p>
          <h1 className="mt-1 text-2xl font-black sm:text-3xl">اعلان‌ها</h1>
          {total > 0 && <p className="mt-1 text-xs text-muted">در مجموع {total} پیام</p>}
        </div>
        {items.length > 0 && <MarkAllReadButton />}
      </div>
      <NotificationSettingsForm initial={settings} />
      <Suspense fallback={<NotificationsSkeleton />}>
        {items.length === 0 ? (
          <Card padding="md">
            <p className="text-center text-sm text-muted">
              اعلانی برای حساب شما ثبت نشده است. پیام‌های جدید در این بخش نمایش داده می‌شوند.
            </p>
          </Card>
        ) : (
          <>
            {items.map((item) => {
              const unread = item.readAt === null;
              return (
                <Card key={item.id} variant={unread ? 'raised' : 'outlined'} padding="md">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h2 className="font-black">{item.title}</h2>
                      <p className="mt-2 text-sm text-muted">{item.message}</p>
                      <p className="mt-2 text-xs text-muted">
                        {formatJalaliDateTime(item.createdAt)}
                      </p>
                      {item.route && (
                        <Link
                          href={item.route}
                          className="mt-2 inline-block text-xs font-bold text-primary hover:underline"
                        >
                          مشاهده جزئیات
                        </Link>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Badge tone={unread ? 'warning' : 'neutral'}>
                        {unread ? 'خوانده‌نشده' : 'خوانده‌شده'}
                      </Badge>
                      {unread && <MarkReadButton id={item.id} />}
                    </div>
                  </div>
                </Card>
              );
            })}
            {totalPages > 1 && (
              <nav aria-label="صفحه‌بندی اعلان‌ها" className="flex items-center justify-between gap-3">
                {page > 1 ? (
                  <ButtonLink href={`/student/notifications?page=${page - 1}`} variant="secondary">
                    قبلی
                  </ButtonLink>
                ) : (
                  <span />
                )}
                <span className="text-xs text-muted">
                  صفحه {page} از {totalPages}
                </span>
                {page < totalPages ? (
                  <ButtonLink href={`/student/notifications?page=${page + 1}`} variant="secondary">
                    بعدی
                  </ButtonLink>
                ) : (
                  <span />
                )}
              </nav>
            )}
          </>
        )}
      </Suspense>
    </div>
  );
}
