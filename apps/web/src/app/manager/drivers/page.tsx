import Link from 'next/link';
import { Bus } from 'lucide-react';
import { Breadcrumbs } from '@/components/navigation/breadcrumbs';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { mockDrivers } from '@/features/manager-drivers/mock-drivers';
export const metadata = { title: 'رانندگان' };
export default function Page() {
  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[{ label: 'پنل مدیر مدرسه', href: '/manager/dashboard' }, { label: 'رانندگان' }]}
      />
      <header>
        <h1 className="text-2xl font-black">رانندگان و مسیرهای مدرسه</h1>
        <p className="mt-2 text-sm text-muted">
          برای مشاهده پرونده کامل، خودرو، مدارک و دانش‌آموزان هر مسیر روی راننده کلیک کنید.
        </p>
      </header>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {mockDrivers.map((d) => (
          <Link key={d.id} href={`/manager/drivers/${d.id}`}>
            <Card className="h-full hover:border-primary/30">
              <div className="flex justify-between">
                <Bus className="text-primary" />
                <Badge tone="warning">آزمایشی</Badge>
              </div>
              <h2 className="mt-4 text-lg font-black">
                {d.firstName} {d.lastName}
              </h2>
              <p className="mt-1 text-sm text-muted">
                {d.vehicleType} {d.system} · {d.plate}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Badge>{d.routes.filter((r) => r.direction === 'TO_SCHOOL').length.toLocaleString('fa-IR')} سرویس رفت</Badge>
                <Badge>{d.routes.filter((r) => r.direction === 'FROM_SCHOOL').length.toLocaleString('fa-IR')} سرویس برگشت</Badge>
                <Badge tone="success">ظرفیت هر سرویس: {d.capacity.toLocaleString('fa-IR')} نفر</Badge>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
