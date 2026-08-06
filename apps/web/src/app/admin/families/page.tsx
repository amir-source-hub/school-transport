import { ChevronLeft } from 'lucide-react';

import { Breadcrumbs } from '@/components/navigation/breadcrumbs';
import { Badge } from '@/components/ui/badge';
import { ButtonLink } from '@/components/ui/button';
import { getAdminFamilies } from '@/features/admin-families/admin-families-api';

export const metadata = { title: 'خانواده‌ها' };
export const dynamic = 'force-dynamic';

export default async function FamiliesPage() {
  const { families } = await getAdminFamilies();

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[{ label: 'پنل مدیریت', href: '/admin/dashboard' }, { label: 'خانواده‌ها' }]}
      />
      <div>
        <p className="text-sm font-bold text-primary">حساب‌های خانواده</p>
        <h1 className="mt-1 text-2xl font-black sm:text-3xl">خانواده‌ها</h1>
      </div>
      <div className="overflow-x-auto" role="region" aria-label="فهرست خانواده‌ها" tabIndex={0}>
        <table className="w-full min-w-[45rem] text-right text-sm">
          <thead>
            <tr className="border-b border-border text-muted">
              <th className="px-3 py-3">نام خانوادگی</th>
              <th className="px-3 py-3">شماره تماس</th>
              <th className="px-3 py-3">تعداد دانش‌آموز</th>
              <th className="px-3 py-3">وضعیت</th>
              <th className="px-3 py-3">اقدام</th>
            </tr>
          </thead>
          <tbody>
            {families.map((family) => (
              <tr key={family.id} className="border-b border-border last:border-0">
                <td className="px-3 py-3 font-bold">{family.username}</td>
                <td className="px-3 py-3" dir="ltr">
                  {family.primaryPhone ?? '—'}
                </td>
                <td className="px-3 py-3">{family.studentCount}</td>
                <td className="px-3 py-3">
                  <Badge tone={family.status === 'فعال' ? 'success' : 'neutral'}>
                    {family.status}
                  </Badge>
                </td>
                <td className="px-3 py-3">
                  <ButtonLink href={`/admin/families/${family.id}`} variant="secondary" size="sm">
                    مشاهده
                    <ChevronLeft aria-hidden="true" className="size-4" />
                  </ButtonLink>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
