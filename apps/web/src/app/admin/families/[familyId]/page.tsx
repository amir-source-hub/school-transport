import { notFound } from 'next/navigation';

import { Breadcrumbs } from '@/components/navigation/breadcrumbs';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { getAdminFamily } from '@/features/admin-families/admin-families-api';
import { formatJalaliDate } from '@/lib/formatters';
import { DeleteParentButton, ParentEditor } from '@/features/admin-families/parent-actions';
import { AdminFamilyEnrollmentForm } from '@/features/admin-families/admin-family-enrollment-form';
import { getSchools } from '@/features/schools/schools-api';
import { metadataFor } from '@/lib/route-metadata';

export const metadata = metadataFor('/admin/families/[familyId]');
export const dynamic = 'force-dynamic';

export default async function FamilyDetailPage({
  params,
}: {
  params: Promise<{ familyId: string }>;
}) {
  const { familyId } = await params;
  const [{ family }, { schools }] = await Promise.all([getAdminFamily(familyId), getSchools()]);
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
            ['تاریخ ثبت‌نام', family.createdAt ? formatJalaliDate(family.createdAt) : '—'],
          ].map(([label, value]) => (
            <div key={label} className="grid gap-1 py-3 sm:grid-cols-[10rem_1fr]">
              <dt className="text-muted">{label}</dt>
              <dd className="font-bold" dir={label === 'شماره تماس' ? 'ltr' : undefined}>
                {value}
              </dd>
            </div>
          ))}
        </dl>
      </Card>
      <Card>
        <h2 className="text-lg font-black">افزودن دانش‌آموز و ایجاد ثبت‌نام کامل</h2>
        <p className="mb-5 mt-2 text-sm text-muted">
          تمام اطلاعات موردنیاز ثبت‌نام والد را وارد کنید. قرارداد و پیش‌پرداخت برای اقدام والد باقی
          می‌ماند.
        </p>
        <AdminFamilyEnrollmentForm family={family} schools={schools} />
      </Card>
      <Card>
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-black">والدین</h2>
          {family.parents.length < 2 && <ParentEditor familyId={family.id} />}
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {family.parents.map((parent) => (
            <section key={parent.id} className="rounded-xl border border-border p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-black">
                    {parent.firstName} {parent.lastName}
                  </p>
                  <p className="mt-1 text-sm text-muted">
                    {parent.parentType === 'FATHER' ? 'پدر' : 'مادر'}
                  </p>
                </div>
                {parent.isPrimaryContact && <Badge tone="success">تماس اصلی</Badge>}
              </div>
              <p className="mt-3 text-sm" dir="ltr">
                {parent.phoneNumber}
              </p>
              <p className="mt-1 text-sm" dir="ltr">
                {parent.nationalId}
              </p>
              <div className="mt-4 flex gap-2 border-t border-border pt-4">
                <ParentEditor familyId={family.id} parent={parent} />
                <DeleteParentButton familyId={family.id} parentId={parent.id} />
              </div>
            </section>
          ))}
        </div>
      </Card>
      {family.students && family.students.length > 0 && (
        <Card>
          <h2 className="text-lg font-black">دانش‌آموزان خانواده</h2>
          <div className="mt-4 divide-y divide-border">
            {family.students.map((student) => (
              <div
                key={student.id}
                className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
              >
                <div>
                  <p className="font-bold">
                    {student.firstName} {student.lastName}
                  </p>
                  <p className="text-sm text-muted">
                    {student.schoolName ?? '—'}، {student.grade ?? '—'}
                  </p>
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
