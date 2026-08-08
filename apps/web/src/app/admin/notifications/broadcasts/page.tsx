import { Breadcrumbs } from '@/components/navigation/breadcrumbs';
import { Card } from '@/components/ui/card';
import { BroadcastForm } from '@/features/admin-broadcasts/broadcast-form';
import { BroadcastList } from '@/features/admin-broadcasts/broadcast-list';
import { getBroadcasts } from '@/features/admin-broadcasts/admin-broadcasts-api';

export const metadata = { title: 'ارسال گروهی پیامک' };
export const dynamic = 'force-dynamic';

export default async function BroadcastsPage() {
  const campaigns = await getBroadcasts();
  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: 'پنل مدیریت', href: '/admin/dashboard' },
          { label: 'اعلان‌ها', href: '/admin/notifications' },
          { label: 'ارسال گروهی پیامک' },
        ]}
      />
      <div>
        <p className="text-sm font-bold text-primary">کمپین‌های رضایت‌محور</p>
        <h1 className="mt-1 text-2xl font-black sm:text-3xl">ارسال گروهی پیامک</h1>
      </div>
      <Card padding="lg">
        <h2 className="mb-5 text-lg font-black">کمپین جدید</h2>
        <BroadcastForm />
      </Card>
      <section>
        <h2 className="mb-4 text-lg font-black">کمپین‌ها و گزارش ارسال</h2>
        <BroadcastList campaigns={campaigns} />
      </section>
    </div>
  );
}
