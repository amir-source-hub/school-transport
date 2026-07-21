import { Alert } from '@/components/feedback/alert';
import { Breadcrumbs } from '@/components/navigation/breadcrumbs';

export function AdminSectionPlaceholder({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: 'پنل مدیریت', href: '/admin/dashboard' }, { label: title }]} />
      <div>
        <p className="text-sm font-bold text-primary">پنل مدیریت</p>
        <h1 className="mt-1 text-2xl font-black sm:text-3xl">{title}</h1>
      </div>
      <Alert title="داده عملیاتی در دسترس نیست">{description}</Alert>
    </div>
  );
}
