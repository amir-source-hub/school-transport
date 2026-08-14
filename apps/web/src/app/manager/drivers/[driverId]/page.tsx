import { notFound } from 'next/navigation';
import { Breadcrumbs } from '@/components/navigation/breadcrumbs';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { mockDrivers } from '@/features/manager-drivers/mock-drivers';
export const metadata = { title: 'جزئیات راننده آزمایشی' };
export default async function Page({ params }: { params: Promise<{ driverId: string }> }) {
  const { driverId } = await params;
  const d = mockDrivers.find((x) => x.id === driverId);
  if (!d) notFound();
  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: 'پنل مدیر مدرسه', href: '/manager/dashboard' },
          { label: 'رانندگان', href: '/manager/drivers' },
          { label: d.name },
        ]}
      />
      <header className="flex justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black">{d.name}</h1>
          <p className="mt-2 text-sm text-muted">پرونده نمایشی راننده و خودرو</p>
        </div>
        <Badge tone="warning">اطلاعات آزمایشی</Badge>
      </header>
      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <h2 className="font-black">خودروی نمونه</h2>
          <dl className="mt-4 grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-muted">خودرو</dt>
              <dd className="font-bold">{d.vehicle}</dd>
            </div>
            <div>
              <dt className="text-muted">رنگ</dt>
              <dd className="font-bold">{d.color}</dd>
            </div>
            <div>
              <dt className="text-muted">پلاک ماسک‌شده</dt>
              <dd className="font-bold">{d.plate}</dd>
            </div>
            <div>
              <dt className="text-muted">ظرفیت</dt>
              <dd className="font-bold">{d.capacity.toLocaleString('fa-IR')} نفر</dd>
            </div>
          </dl>
        </Card>
        <Card>
          <h2 className="font-black">مدارک نمونه</h2>
          <div className="mt-4 space-y-3">
            {d.documents.map((x) => (
              <div
                key={x.title}
                className="flex justify-between gap-3 rounded-xl bg-surface-muted p-3 text-sm"
              >
                <span>{x.title}</span>
                <Badge tone={x.status.startsWith('تأیید') ? 'success' : 'warning'}>
                  {x.status}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      </div>
      <Card className="border-warning/25 bg-warning-soft">
        <p className="text-sm font-bold leading-7">
          هیچ شماره تماس، کد ملی، شماره گواهینامه یا سند واقعی در این پیش‌نمایش نگهداری یا نمایش
          داده نمی‌شود.
        </p>
      </Card>
    </div>
  );
}
