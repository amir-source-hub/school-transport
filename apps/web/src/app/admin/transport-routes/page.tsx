import { Breadcrumbs } from '@/components/navigation/breadcrumbs';
import { RouteManagement } from '@/features/admin-drivers/route-management';
import {
  getAdminDrivers,
  getAdminTransportRoutes,
} from '@/features/admin-drivers/admin-drivers-api';
import { getAdminSchools } from '@/features/admin-schools/admin-schools-api';
import { getAdminStudents } from '@/features/admin-students/admin-students-api';
import { FilteredCount } from '@/components/data/filtered-count';

export const metadata = { title: 'مدیریت مسیرها' };
export const dynamic = 'force-dynamic';
export default async function Page() {
  const [routes, drivers, { schools }, { students }] = await Promise.all([
    getAdminTransportRoutes(),
    getAdminDrivers(),
    getAdminSchools(),
    getAdminStudents({ archive: 'active', pageSize: 100 }),
  ]);
  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[{ label: 'پنل مدیریت', href: '/admin/dashboard' }, { label: 'مدیریت مسیرها' }]}
      />
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-primary">تخصیص هوشمند سرویس</p>
          <h1 className="text-2xl font-black">مسیرها و ارتباط راننده–دانش‌آموز</h1>
          <p className="mt-2 max-w-3xl text-sm leading-7 text-muted">
            ابتدا مسیرها را تعریف کنید، سپس رفت و برگشت هر دانش‌آموز را با یک راننده ثبت کنید.
            تخصیص‌های قبلی با نشان رفت و برگشت مشخص می‌شوند؛ عبور از ظرفیت با هشدار نمایش داده
            می‌شود.
          </p>
        </div>
        <FilteredCount count={routes.length} label="مسیر فعال" />
      </header>
      <RouteManagement routes={routes} drivers={drivers} schools={schools} students={students} />
    </div>
  );
}
