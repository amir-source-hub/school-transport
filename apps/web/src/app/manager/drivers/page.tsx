import Link from 'next/link';
import { Bus } from 'lucide-react';
import { Breadcrumbs } from '@/components/navigation/breadcrumbs';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { mockDrivers } from '@/features/manager-drivers/mock-drivers';
import { featureFlags } from '@/lib/feature-flags';
export const metadata = { title: 'رانندگان' };
export default function Page() {
  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[{ label: 'پنل مدیر مدرسه', href: '/manager/dashboard' }, { label: 'رانندگان' }]}
      />
      <header className="flex flex-wrap justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black">رانندگان</h1>
          <p className="mt-2 text-sm text-muted">پیش‌نمایش طراحی؛ این اطلاعات عملیاتی نیست.</p>
        </div>
        <Badge tone="warning">اطلاعات آزمایشی</Badge>
      </header>
      {!featureFlags.managerDriverPreview ? (
        <Card>
          <Bus className="size-8 text-muted" />
          <h2 className="mt-4 font-black">پیش‌نمایش رانندگان فعال نیست</h2>
          <p className="mt-2 text-sm text-muted">
            این بخش پس از راه‌اندازی دامنه واقعی رانندگان در دسترس قرار می‌گیرد.
          </p>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {mockDrivers.map((d) => (
            <Link key={d.id} href={`/manager/drivers/${d.id}`}>
              <Card className="h-full hover:-translate-y-0.5 hover:border-primary/30">
                <div className="flex justify-between">
                  <div className="grid size-12 place-items-center rounded-full bg-primary-soft text-primary">
                    <Bus />
                  </div>
                  <Badge tone="warning">آزمایشی</Badge>
                </div>
                <h2 className="mt-4 text-lg font-black">{d.name}</h2>
                <p className="mt-1 text-sm text-muted">
                  {d.vehicle}، {d.color}
                </p>
                <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <dt className="text-muted">ظرفیت</dt>
                    <dd className="font-bold">{d.capacity.toLocaleString('fa-IR')} نفر</dd>
                  </div>
                  <div>
                    <dt className="text-muted">دانش‌آموز نمونه</dt>
                    <dd className="font-bold">{d.assigned.toLocaleString('fa-IR')} نفر</dd>
                  </div>
                  <div className="col-span-2">
                    <dt className="text-muted">محدوده نمونه</dt>
                    <dd className="font-bold">{d.route}</dd>
                  </div>
                </dl>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
