import { Breadcrumbs } from '@/components/navigation/breadcrumbs';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { getAdminNotifications } from '@/features/admin-notifications/admin-notifications-api';

export const metadata = { title: 'اعلان‌ها' };

const typeStyles: Record<string, 'info' | 'warning' | 'success'> = {
  info: 'info',
  warning: 'warning',
  success: 'success',
};

export default async function NotificationsPage() {
  const { notifications } = await getAdminNotifications();

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: 'پنل مدیریت', href: '/admin/dashboard' }, { label: 'اعلان‌ها' }]} />
      <div>
        <p className="text-sm font-bold text-primary">رویدادهای عملیاتی</p>
        <h1 className="mt-1 text-2xl font-black sm:text-3xl">اعلان‌ها</h1>
      </div>
      <div className="space-y-3">
        {notifications.map((notif) => (
          <Card key={notif.id} variant={notif.readAt ? 'outlined' : 'raised'} padding="md">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                {!notif.readAt && <span className="h-2 w-2 rounded-full bg-primary" aria-label="خوانده نشده" />}
                <p className={`font-black ${!notif.readAt ? '' : 'text-muted'}`}>{notif.title}</p>
              </div>
              <Badge tone={typeStyles[notif.type] ?? 'neutral'}>{notif.type === 'warning' ? 'هشدار' : notif.type === 'success' ? 'موفق' : 'اطلاع'}</Badge>
            </div>
            <p className="mt-2 text-sm text-muted">{notif.message}</p>
            <p className="mt-2 text-xs text-muted">{notif.createdAt}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
