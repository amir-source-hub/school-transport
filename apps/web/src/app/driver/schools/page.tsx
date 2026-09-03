import { Building2, Clock3, MapPin, Phone, UserRound } from 'lucide-react';
import { Breadcrumbs } from '@/components/navigation/breadcrumbs';
import { Card } from '@/components/ui/card';
import { getDriverSchools } from '@/features/driver/driver-api';

export const metadata = { title: 'مدارس من' };
export default async function Page() {
  const schools = await getDriverSchools();
  return <div className="space-y-6">
    <Breadcrumbs items={[{ label: 'پنل راننده', href: '/driver/dashboard' }, { label: 'مدارس من' }]} />
    <header><p className="text-sm font-bold text-primary">مدارس مسیرهای فعال</p><h1 className="text-2xl font-black">مدارس من</h1><p className="mt-2 text-sm text-muted">اطلاعات تماس، نشانی و موقعیت مدارسی که در مسیرهای شما قرار دارند.</p></header>
    {schools.length ? <div className="grid gap-5 xl:grid-cols-2">{schools.map((school) => <Card key={school.id}>
      <div className="flex items-start gap-3"><span className="grid size-11 place-items-center rounded-xl bg-primary-soft text-primary"><Building2 /></span><div><h2 className="font-black">{school.name}</h2><p className="text-xs text-muted">{school.province}، {school.city}{school.district ? `، منطقه ${school.district}` : ''}</p></div></div>
      <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
        <div className="sm:col-span-2"><dt className="text-xs text-muted">نشانی</dt><dd className="mt-1 flex gap-2 font-bold"><MapPin className="size-4 shrink-0 text-primary" />{school.address}</dd></div>
        <div><dt className="text-xs text-muted">تلفن مدرسه</dt><dd className="mt-1 font-bold"><Phone className="me-1 inline size-4" />{school.phoneNumber ?? 'ثبت نشده'}</dd></div>
        <div><dt className="text-xs text-muted">ساعات فعالیت</dt><dd className="mt-1 font-bold"><Clock3 className="me-1 inline size-4" />{school.openingTime} تا {school.closingTime}</dd></div>
        <div><dt className="text-xs text-muted">مدیر مدرسه</dt><dd className="mt-1 font-bold"><UserRound className="me-1 inline size-4" />{school.managerName ?? 'ثبت نشده'}</dd></div>
        <div><dt className="text-xs text-muted">تماس مدیر</dt><dd className="mt-1 font-bold">{school.managerPhone ?? 'ثبت نشده'}</dd></div>
      </dl>
      {school.latitude != null && school.longitude != null && <a className="mt-5 inline-flex min-h-10 items-center rounded-lg bg-primary-soft px-4 text-sm font-bold text-primary" href={`https://www.google.com/maps?q=${school.latitude},${school.longitude}`} target="_blank" rel="noreferrer">نمایش روی نقشه</a>}
    </Card>)}</div> : <Card><p className="text-sm text-muted">هنوز مدرسه‌ای به مسیرهای شما متصل نشده است.</p></Card>}
  </div>;
}
