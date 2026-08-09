import { Breadcrumbs } from '@/components/navigation/breadcrumbs';
import { Badge } from '@/components/ui/badge';
import { getAdminAccounts, getCurrentAdminAccount } from '@/features/admin-admins/admin-admins-api';
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
      <div className="grid gap-3 md:hidden" aria-label="فهرست مدیران">
        {admins.map((admin) => (
          <section key={admin.id} className="rounded-xl border border-border bg-surface p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="break-all font-black">{admin.username}</h2>
                <p className="mt-1 text-sm text-muted">
                  {admin.firstName} {admin.lastName}
                </p>
              </div>
              <Badge tone={admin.status === 'ACTIVE' ? 'success' : 'neutral'}>
                {admin.status === 'ACTIVE' ? 'فعال' : 'غیرفعال'}
              </Badge>
            </div>
            <dl className="mt-4 text-sm">
              <dt className="text-muted">آخرین ورود</dt>
              <dd className="mt-1 font-bold">
                {admin.lastLoginAt ? formatJalaliDateTime(admin.lastLoginAt) : '—'}
              </dd>
            </dl>
            <div className="mt-4 flex flex-wrap gap-2">
              <AdminAccountForm admin={admin} />
              <AdminAccountAction
                id={admin.id}
                active={admin.status === 'ACTIVE'}
                isSelf={admin.id === current.id}
              />
            </div>
          </section>
        ))}
      </div>
      <div
        className="hidden overflow-x-auto md:block"
        role="region"
        aria-label="جدول مدیران"
        tabIndex={0}
      >
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
                <td className="px-3 py-3 font-bold">{admin.username}</td>
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
