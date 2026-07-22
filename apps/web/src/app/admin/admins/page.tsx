import { Breadcrumbs } from '@/components/navigation/breadcrumbs';
import { Badge } from '@/components/ui/badge';

export const metadata = { title: 'مدیران سامانه' };

const demoAdmins = [
  { id: 'admin-001', username: 'demo-admin', role: 'مدیر ارشد', status: 'فعال', lastLogin: '۱۴۰۴/۰۳/۱۵ ۱۰:۳۰' },
  { id: 'admin-002', username: 'admin2', role: 'مدیر مالی', status: 'فعال', lastLogin: '۱۴۰۴/۰۳/۱۴ ۰۹:۰۰' },
];

export default function AdminsPage() {
  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: 'پنل مدیریت', href: '/admin/dashboard' }, { label: 'مدیران' }]} />
      <div>
        <p className="text-sm font-bold text-primary">مدیریت دسترسی</p>
        <h1 className="mt-1 text-2xl font-black sm:text-3xl">مدیران سامانه</h1>
      </div>
      <div className="overflow-x-auto" role="region" aria-label="فهرست مدیران" tabIndex={0}>
        <table className="w-full min-w-[35rem] text-right text-sm">
          <thead>
            <tr className="border-b border-border text-muted">
              <th className="px-3 py-3">نام کاربری</th>
              <th className="px-3 py-3">نقش</th>
              <th className="px-3 py-3">وضعیت</th>
              <th className="px-3 py-3">آخرین ورود</th>
            </tr>
          </thead>
          <tbody>
            {demoAdmins.map((admin) => (
              <tr key={admin.id} className="border-b border-border last:border-0">
                <td className="px-3 py-3 font-bold">{admin.username}</td>
                <td className="px-3 py-3">{admin.role}</td>
                <td className="px-3 py-3"><Badge tone="success">{admin.status}</Badge></td>
                <td className="px-3 py-3 text-muted" dir="ltr">{admin.lastLogin}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
