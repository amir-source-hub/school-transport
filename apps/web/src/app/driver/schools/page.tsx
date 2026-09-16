import { Building2, MapPin } from 'lucide-react';
import { MapProviderLinks } from '@/components/common/map-provider-links';
import { Breadcrumbs } from '@/components/navigation/breadcrumbs';
import { Card } from '@/components/ui/card';
import { getDriverSchools } from '@/features/driver/driver-api';

export const metadata = { title: 'مدارس من' };
export default async function Page() {
  const schools = await getDriverSchools();
  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[{ label: 'پنل راننده', href: '/driver/dashboard' }, { label: 'مدارس من' }]}
      />
      <header>
        <p className="text-sm font-bold text-primary">مدارس مسیرهای فعال</p>
        <h1 className="text-2xl font-black">مدارس من</h1>
        <p className="mt-2 text-sm text-muted">نام، نشانی و موقعیت مدارس مسیرهای شما.</p>
      </header>
      {schools.length ? (
        <div className="grid gap-5 xl:grid-cols-2">
          {schools.map((school) => (
            <Card key={school.id} className="p-6 sm:p-7">
              <div className="flex items-center gap-4">
                <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-primary-soft text-primary">
                  <Building2 className="size-7" />
                </span>
                <h2 className="text-xl font-black sm:text-2xl">{school.name}</h2>
              </div>
              <div className="mt-6 rounded-2xl bg-surface-inset p-5">
                <p className="text-sm font-bold text-muted">نشانی مدرسه</p>
                <p className="mt-2 flex gap-3 text-base font-black leading-8">
                  <MapPin className="mt-1 size-5 shrink-0 text-primary" />
                  {school.address}
                </p>
              </div>
              {school.latitude != null && school.longitude != null && (
                <MapProviderLinks latitude={school.latitude} longitude={school.longitude} />
              )}
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <p className="text-sm text-muted">هنوز مدرسه‌ای به مسیرهای شما متصل نشده است.</p>
        </Card>
      )}
    </div>
  );
}
