import { Breadcrumbs } from '@/components/navigation/breadcrumbs';
import { Badge } from '@/components/ui/badge';
import {
  getAdminAccounts,
  getCurrentAdminAccount,
} from '@/features/admin-admins/admin-admins-api';
import { AdminAccountAction } from '@/features/admin-admins/admin-account-action';
import { AdminAccountForm } from '@/features/admin-admins/admin-account-form';
import { formatJalaliDateTime } from '@/lib/formatters';

export const metadata = { title: 'مدیران سامانه' };

export const dynamic = 'force-dynamic';

export default async function AdminsPage() {
  const [admins, current] = await Promise.all([getAdminAccounts(), getCurrentAdminAccount()]);
  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[{ label: 'پنل مدیریت', href: '/admin/dashboard' }, { label: 'مدیران' }]}
      />
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-primary">مدیریت دسترسی</p>
          <h1 className="mt-1 text-2xl font-black sm:text-3xl">مدیران سامانه</h1>
        </div>
        <AdminAccountForm />
      </div>
      <div className="overflow-x-auto" role="region" aria-label="فهرست مدیران" tabIndex={0}>
        <table className="w-full min-w-[35rem] text-right text-sm">
          <thead>
            <tr className="border-b border-border text-muted">
              <th className="px-3 py-3">نام کاربری</th>
              <th className="px-3 py-3">نام</th>
              <th className="px-3 py-3">وضعیت</th>
              <th className="px-3 py-3">آخرین ورود</th>
              <th className="px-3 py-3">اقدام</th>
            </tr>
          </thead>
          <tbody>
            {admins.map((admin) => (
              <tr key={admin.id} className="border-b border-border last:border-0">
                <td className="px-3 py-3 font-bold">
                  {admin.username}
                  {admin.isSuperAdmin && (
                    <span className="mr-2">
                      <Badge tone="info">فوق‌مدیر</Badge>
                    </span>
                  )}
                </td>
                <td className="px-3 py-3">
                  {admin.firstName} {admin.lastName}
                </td>
                <td className="px-3 py-3">
                  <Badge tone={admin.status === 'ACTIVE' ? 'success' : 'neutral'}>
                    {admin.status === 'ACTIVE' ? 'فعال' : 'غیرفعال'}
                  </Badge>
                </td>
                <td className="px-3 py-3 text-muted">
                  {admin.lastLoginAt ? formatJalaliDateTime(admin.lastLoginAt) : '—'}
                </td>
                <td className="px-3 py-3">
                  <div className="flex gap-2">
                    <AdminAccountForm admin={admin} />
                    <AdminAccountAction
                      id={admin.id}
                      active={admin.status === 'ACTIVE'}
                      isSelf={admin.id === current.id}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
