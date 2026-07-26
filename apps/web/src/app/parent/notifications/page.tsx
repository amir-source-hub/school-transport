import { Breadcrumbs } from '@/components/navigation/breadcrumbs';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { MarkAllReadButton, MarkReadButton } from '@/features/notifications/notification-actions';
import { getNotifications } from '@/features/notifications/notifications-api';
export const metadata = { title: 'اعلان‌ها' };
export const dynamic = 'force-dynamic';
export default async function NotificationsPage() {
  const notifications = await getNotifications();
  return <div className="space-y-6"><Breadcrumbs items={[{ label: 'پنل خانواده', href: '/parent/dashboard' }, { label: 'اعلان‌ها' }]} /><div className="flex items-end justify-between gap-3"><div><p className="text-sm font-bold text-primary">پیام‌های حساب</p><h1 className="mt-1 text-2xl font-black sm:text-3xl">اعلان‌ها</h1></div><MarkAllReadButton /></div>{notifications.map((item) => <Card key={item.id}><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-black">{item.title}</h2><p className="mt-2 text-sm text-muted">{item.message}</p><p className="mt-2 text-xs text-muted">{item.createdAt.toLocaleString('fa-IR')}</p></div><div className="flex items-center gap-2"><Badge tone={item.notificationStatus === 'PENDING' ? 'warning' : 'neutral'}>{item.notificationStatus === 'PENDING' ? 'خوانده‌نشده' : 'خوانده‌شده'}</Badge>{item.notificationStatus === 'PENDING' && <MarkReadButton id={item.id} />}</div></div></Card>)}</div>;
}
