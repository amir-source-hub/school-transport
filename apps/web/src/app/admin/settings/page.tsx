import { Alert } from '@/components/feedback/alert';
import { Breadcrumbs } from '@/components/navigation/breadcrumbs';

export const metadata = { title: 'تنظیمات' };

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: 'پنل مدیریت', href: '/admin/dashboard' }, { label: 'تنظیمات' }]} />
      <div>
        <p className="text-sm font-bold text-primary">پیکربندی سامانه</p>
        <h1 className="mt-1 text-2xl font-black sm:text-3xl">تنظیمات</h1>
      </div>
      <Alert title="بخش در حال راه‌اندازی">
        تنظیمات سامانه شامل پیکربندی اعلان‌ها، نقش‌ها و پارامترهای عملیاتی پس از تکامل MVP فعال خواهد شد.
      </Alert>
    </div>
  );
}
