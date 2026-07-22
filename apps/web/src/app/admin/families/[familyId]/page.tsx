import { notFound } from 'next/navigation';

import { Breadcrumbs } from '@/components/navigation/breadcrumbs';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { getAdminFamily } from '@/features/admin-families/admin-families-api';

export const dynamic = 'force-dynamic';

export default async function FamilyDetailPage({
  params,
}: {
  params: Promise<{ familyId: string }>;
}) {
  const { familyId } = await params;
  const { family } = await getAdminFamily(familyId);
  if (!family) notFound();

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: 'پنل مدیریت', href: '/admin/dashboard' },
          { label: 'خانواده‌ها', href: '/admin/families' },
          { label: family.username },
        ]}
      />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-bold text-primary">مشاهده خانواده</p>
          <h1 className="mt-1 text-2xl font-black sm:text-3xl">{family.username}</h1>
        </div>
        <Badge tone={family.status === 'فعال' ? 'success' : 'neutral'}>{family.status}</Badge>
      </div>
      <Card>
        <h2 className="text-lg font-black">اطلاعات خانواده</h2>
        <dl className="mt-4 divide-y divide-border text-sm">
          {[
            ['نام خانوادگی', family.username],
            ['شماره تماس', family.primaryPhone ?? 'ثبت نشده'],
            ['تعداد دانش‌آموز', String(family.studentCount)],
            ['تاریخ ثبت‌نام', family.createdAt ?? '—'],
          ].map(([label, value]) => (
            <div key={label} className="grid gap-1 py-3 sm:grid-cols-[10rem_1fr]">
              <dt className="text-muted">{label}</dt>
              <dd className="font-bold" dir={label === 'شماره تماس' ? 'ltr' : undefined}>{value}</dd>
            </div>
          ))}
        </dl>
      </Card>
      {family.students && family.students.length > 0 && (
        <Card>
          <h2 className="text-lg font-black">دانش‌آموزان خانواده</h2>
          <div className="mt-4 divide-y divide-border">
            {family.students.map((student) => (
              <div key={student.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                <div>
                  <p className="font-bold">{student.firstName} {student.lastName}</p>
                  <p className="text-sm text-muted">{student.schoolName ?? '—'}، {student.grade ?? '—'}</p>
                </div>
                <Badge tone="success">{student.status}</Badge>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
