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
import { getStudents } from '@/features/students/students-api';
import { getEnrollments } from '@/features/enrollment/enrollments-api';

const activityStatus: Record<string, string> = {
  DRAFT: 'پیش‌نویس ثبت‌نام',
  SUBMITTED: 'در انتظار بررسی ثبت‌نام',
  UNDER_REVIEW: 'ثبت‌نام در حال بررسی',
  NEEDS_CORRECTION: 'ثبت‌نام نیازمند اصلاح',
  APPROVED: 'ثبت‌نام تأیید و در انتظار قیمت',
  CONTRACT_READY: 'قرارداد آماده بررسی',
  CONTRACT_ACCEPTED: 'قرارداد پذیرفته‌شده',
  ENROLLED: 'سرویس فعال',
};

export const metadata = { title: 'اعلان‌ها' };
export const dynamic = 'force-dynamic';

export function NotificationsSkeleton() {
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
  searchParams: Promise<{ page?: string; snapshotAt?: string }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? '1', 10) || 1);
  const [list, settings, activityResult] = await Promise.all([
    getNotifications(page, 20, params.snapshotAt),
    getNotificationSettings(),
    Promise.all([getStudents(), getEnrollments()]).catch(() => null),
  ]);
  const { items, total, pageSize } = list;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const accountActivity = activityResult
    ? activityResult[1].map((enrollment) => {
        const student = activityResult[0].find((item) => item.id === enrollment.studentId);
        return {
          id: enrollment.id,
          title: student ? `${student.firstName} ${student.lastName}` : 'دانش‌آموز',
          message: activityStatus[enrollment.registrationStatus] ?? enrollment.registrationStatus,
        };
      })
    : [];

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
        {items.length === 0 && accountActivity.length === 0 ? (
          <Card padding="md">
            <p className="text-center text-sm text-muted">
              اعلانی برای حساب شما ثبت نشده است. پیام‌های جدید در این بخش نمایش داده می‌شوند.
            </p>
          </Card>
        ) : items.length > 0 ? (
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
              <nav
                aria-label="صفحه‌بندی اعلان‌ها"
                className="flex items-center justify-between gap-3"
              >
                {page > 1 ? (
                  <ButtonLink
                    href={`/student/notifications?page=${page - 1}&snapshotAt=${encodeURIComponent(list.snapshotAt)}`}
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
                    href={`/student/notifications?page=${page + 1}&snapshotAt=${encodeURIComponent(list.snapshotAt)}`}
                    variant="secondary"
                  >
                    بعدی
                  </ButtonLink>
                ) : (
                  <span />
                )}
              </nav>
            )}
          </>
        ) : null}
      </Suspense>
      {accountActivity.length > 0 && (
        <section aria-labelledby="account-activity-heading" className="space-y-3">
          <div>
            <h2 id="account-activity-heading" className="text-lg font-black">
              فعالیت‌های حساب
            </h2>
            <p className="mt-1 text-sm text-muted">
              همان وضعیت‌های فرایندی که در داشبورد می‌بینید، برای هر دانش‌آموز جداگانه نمایش داده
              شده‌اند.
            </p>
          </div>
          {accountActivity.map((activity) => (
            <Card key={activity.id} variant="outlined" padding="md">
              <h3 className="font-black">{activity.title}</h3>
              <p className="mt-2 text-sm text-muted">{activity.message}</p>
            </Card>
          ))}
        </section>
      )}
    </div>
  );
}
