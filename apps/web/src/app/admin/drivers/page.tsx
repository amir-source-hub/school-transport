import Link from 'next/link';
import { Bus } from 'lucide-react';
import { Breadcrumbs } from '@/components/navigation/breadcrumbs';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { getAdminDrivers } from '@/features/admin-drivers/admin-drivers-api';

export const metadata = { title: 'رانندگان' };
export const dynamic = 'force-dynamic';
export default async function Page() {
  const drivers = await getAdminDrivers();
  return <div className="space-y-6"><Breadcrumbs items={[{ label: 'پنل مدیریت', href: '/admin/dashboard' }, { label: 'رانندگان' }]} />
    <header><h1 className="text-2xl font-black">رانندگان ثبت‌شده</h1><p className="mt-2 text-sm text-muted">پرونده واقعی راننده، خودرو، سرویس‌ها و دانش‌آموزان متصل</p></header>
    {!drivers.length && <Card><p className="text-sm text-muted">هنوز راننده‌ای ثبت نشده است.</p></Card>}
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{drivers.map((driver) => <Link key={driver.id} href={`/admin/drivers/${driver.id}`}><Card className="h-full hover:border-primary/40"><div className="flex justify-between"><Bus className="text-primary" /><Badge tone={driver.status === 'ACTIVE' ? 'success' : 'neutral'}>{driver.status === 'ACTIVE' ? 'فعال' : driver.status}</Badge></div><h2 className="mt-4 text-lg font-black">{driver.firstName} {driver.lastName}</h2><p className="mt-1 text-sm text-muted">{driver.vehicleType ?? 'خودرو ثبت نشده'} {driver.vehicleSystem ?? ''} · {driver.plateNumber ?? 'بدون پلاک'}</p><p className="mt-3 text-xs text-muted">کد ملی: {driver.nationalId} · همراه: {driver.phoneNumber}</p></Card></Link>)}</div>
  </div>;
}
