import { Breadcrumbs } from '@/components/navigation/breadcrumbs';
import { EnrollmentReadiness } from '@/features/enrollment/enrollment-readiness';

export const metadata = { title: 'ثبت‌نام' };

export default function EnrollmentsPage() {
  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[{ label: 'پنل خانواده', href: '/parent/dashboard' }, { label: 'ثبت‌نام' }]}
      />
      <div>
        <p className="text-sm font-bold text-primary">فرایند ثبت‌نام دانش‌آموز</p>
        <h1 className="mt-1 text-2xl font-black sm:text-3xl">ثبت‌نام</h1>
        <p className="mt-2 text-sm text-muted">
          وضعیت آماده‌سازی رابط ثبت‌نام بر اساس اسناد فعلی پروژه نمایش داده می‌شود.
        </p>
      </div>
      <EnrollmentReadiness />
    </div>
  );
}
