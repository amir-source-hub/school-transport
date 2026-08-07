import { Breadcrumbs } from '@/components/navigation/breadcrumbs';
import { Alert } from '@/components/feedback/alert';

export function StudentSectionPlaceholder({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[{ label: 'پنل دانش‌آموز', href: '/student/dashboard' }, { label: title }]}
      />
      <div>
        <p className="text-sm font-bold text-primary">پنل دانش‌آموز</p>
        <h1 className="mt-1 text-2xl font-black sm:text-3xl">{title}</h1>
      </div>
      <Alert title="داده‌ای برای نمایش وجود ندارد">{description}</Alert>
    </div>
  );
}
