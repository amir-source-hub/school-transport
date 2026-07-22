import { Alert } from '@/components/feedback/alert';
import { Breadcrumbs } from '@/components/navigation/breadcrumbs';

export const metadata = { title: 'درخواست‌های خدمت' };

export default function ServiceRequestsPage() {
  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: 'پنل مدیریت', href: '/admin/dashboard' }, { label: 'درخواست‌های خدمت' }]} />
      <div>
        <p className="text-sm font-bold text-primary">پشتیبانی دانش‌آموزان</p>
        <h1 className="mt-1 text-2xl font-black sm:text-3xl">درخواست‌های خدمت</h1>
      </div>
      <Alert title="بخش در حال راه‌اندازی">
        درخواست‌های خدمت دانش‌آموزمحور پس از فعال‌سازی ماژول مربوطه در این بخش قابل بررسی خواهند بود.
      </Alert>
    </div>
  );
}
