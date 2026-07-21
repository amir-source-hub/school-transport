import { Breadcrumbs } from '@/components/navigation/breadcrumbs';
import { EnrollmentWizard } from '@/features/enrollment/enrollment-wizard';

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
          پیش‌نویس چندمرحله‌ای با داده نمایشی و بدون ارسال به سرور تکمیل می‌شود.
        </p>
      </div>
      <EnrollmentWizard />
    </div>
  );
}
