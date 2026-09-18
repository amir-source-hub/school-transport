import Link from 'next/link';
import { Bus } from 'lucide-react';
import { Breadcrumbs } from '@/components/navigation/breadcrumbs';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { FilteredCount } from '@/components/data/filtered-count';
import { getAdminDrivers } from '@/features/admin-drivers/admin-drivers-api';
import { sortAdminDrivers, type DriverSort } from '@/features/admin-drivers/admin-driver-sort';

export const metadata = { title: 'رانندگان' };
export const dynamic = 'force-dynamic';

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; sort?: DriverSort }>;
}) {
  const filters = await searchParams;
  const drivers = await getAdminDrivers();
  const query = (filters.q ?? '').trim().toLocaleLowerCase('fa');
  const sort: DriverSort = ['newest', 'oldest', 'name-asc', 'name-desc'].includes(
    filters.sort ?? '',
  )
    ? (filters.sort as DriverSort)
    : 'newest';
  const visible = sortAdminDrivers(
    drivers.filter(
      (driver) =>
        (!query ||
          `${driver.firstName} ${driver.lastName} ${driver.phoneNumber} ${driver.nationalId} ${driver.plateNumber ?? ''}`
            .toLocaleLowerCase('fa')
            .includes(query)) &&
        (!filters.status || filters.status === 'ALL' || driver.status === filters.status),
    ),
    sort,
  );

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[{ label: 'پنل مدیریت', href: '/admin/dashboard' }, { label: 'رانندگان' }]}
      />
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black">رانندگان ثبت‌شده</h1>
          <p className="mt-2 text-sm text-muted">
            پرونده راننده، خودرو، سرویس‌ها و دانش‌آموزان متصل
          </p>
        </div>
        <FilteredCount count={visible.length} label="راننده مطابق فیلتر" />
      </header>
      <form className="grid gap-3 rounded-2xl border border-border bg-white p-4 md:grid-cols-[minmax(0,1fr)_11rem_13rem_auto]">
        <Input
          type="search"
          name="q"
          defaultValue={filters.q}
          placeholder="نام، کد ملی، تلفن یا پلاک…"
          aria-label="جست‌وجوی رانندگان"
        />
        <select
          name="status"
          aria-label="فیلتر وضعیت راننده"
          defaultValue={filters.status ?? 'ALL'}
          className="min-h-12 rounded-xl border border-border bg-white px-3"
        >
          <option value="ALL">همه وضعیت‌ها</option>
          <option value="ACTIVE">فعال</option>
          <option value="INACTIVE">بایگانی‌شده</option>
        </select>
        <select
          name="sort"
          aria-label="مرتب‌سازی رانندگان"
          defaultValue={sort}
          className="min-h-12 rounded-xl border border-border bg-white px-3"
        >
          <option value="newest">جدیدترین ثبت‌نام</option>
          <option value="oldest">قدیمی‌ترین ثبت‌نام</option>
          <option value="name-asc">نام، الف تا ی</option>
          <option value="name-desc">نام، ی تا الف</option>
        </select>
        <div className="flex gap-2">
          <button className="min-h-12 rounded-xl bg-primary px-5 font-bold text-white">
            اعمال
          </button>
          <Link
            href="/admin/drivers"
            className="inline-flex min-h-12 items-center rounded-xl border border-border px-4 font-bold"
          >
            پاک‌کردن
          </Link>
        </div>
      </form>
      {!visible.length && (
        <Card>
          <p className="text-sm text-muted">راننده‌ای با این جست‌وجو و فیلتر پیدا نشد.</p>
        </Card>
      )}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {visible.map((driver) => (
          <Link key={driver.id} href={`/admin/drivers/${driver.id}`}>
            <Card className="h-full hover:border-primary/40">
              <div className="flex justify-between">
                <Bus className="text-primary" />
                <Badge tone={driver.status === 'ACTIVE' ? 'success' : 'neutral'}>
                  {driver.status === 'ACTIVE' ? 'فعال' : 'بایگانی‌شده'}
                </Badge>
              </div>
              <h2 className="mt-4 text-lg font-black">
                {driver.firstName} {driver.lastName}
              </h2>
              <p className="mt-1 text-sm text-muted">
                {driver.vehicleType ?? 'خودرو ثبت نشده'} {driver.vehicleSystem ?? ''} ·{' '}
                {driver.plateNumber ?? 'بدون پلاک'}
              </p>
              <p className="mt-3 text-xs text-muted">
                کد ملی: {driver.nationalId} · همراه: {driver.phoneNumber}
              </p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
