import { AdminSectionPlaceholder } from '@/features/admin-shell/admin-section-placeholder';
export const metadata = { title: 'خانواده‌ها' };
export default function Page() {
  return (
    <AdminSectionPlaceholder
      title="خانواده‌ها"
      description="حساب‌های خانواده و جزئیات مالکیت فقط از API مجاز مدیریت نمایش داده می‌شوند."
    />
  );
}
