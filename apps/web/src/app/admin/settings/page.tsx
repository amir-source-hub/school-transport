import { Breadcrumbs } from '@/components/navigation/breadcrumbs';
import { AdminAccountForm } from '@/features/admin-admins/admin-account-form';
import { getCurrentAdminAccount } from '@/features/admin-admins/admin-admins-api';

export const metadata = { title: 'تنظیمات' };

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const admin = await getCurrentAdminAccount();
  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[{ label: 'پنل مدیریت', href: '/admin/dashboard' }, { label: 'تنظیمات' }]}
      />
      <div>
        <p className="text-sm font-bold text-primary">حساب کاربری</p>
        <h1 className="mt-1 text-2xl font-black sm:text-3xl">تنظیمات مدیر</h1>
      </div>
      <section className="rounded-2xl border border-border bg-white p-6">
        <h2 className="text-lg font-black">
          {admin.firstName} {admin.lastName}
        </h2>
        <p className="mt-2 text-sm text-muted">
          {admin.phoneNumber} · {admin.email ?? 'بدون ایمیل'}
        </p>
        <div className="mt-5">
          <AdminAccountForm admin={admin} triggerLabel="ویرایش اطلاعات من" />
        </div>
      </section>
    </div>
  );
}
