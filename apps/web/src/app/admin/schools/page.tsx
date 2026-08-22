import { Breadcrumbs } from '@/components/navigation/breadcrumbs';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { LocationDisplay } from '@/components/common/location-display';
import {
  getAdminSchools,
  GENDER_TYPE_LABELS,
  SCHOOL_TYPE_LABELS,
} from '@/features/admin-schools/admin-schools-api';
import { ArchiveSchoolDialog } from '@/features/admin-schools/archive-action';
import { SchoolFormDialog } from '@/features/admin-schools/school-form-dialog';

export const metadata = { title: 'مدارس ما' };
export const dynamic = 'force-dynamic';

export default async function SchoolsPage() {
  const { schools } = await getAdminSchools();
  const activeSchools = schools.filter((s) => s.status !== 'غیرفعال');
  const archivedSchools = schools.filter((s) => s.status === 'غیرفعال');

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[{ label: 'پنل مدیریت', href: '/admin/dashboard' }, { label: 'مدارس ما' }]}
      />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-bold text-primary">مدیریت مدارس</p>
          <h1 className="mt-1 text-2xl font-black sm:text-3xl">مدارس ما</h1>
        </div>
        <SchoolFormDialog mode="create" />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {activeSchools.map((school) => (
          <Card key={school.id}>
            <div className="flex items-start justify-between gap-3">
              <p className="font-black">{school.name}</p>
              <div className="flex items-center gap-2">
                <Badge tone="success">{school.status}</Badge>
              </div>
            </div>
            <p className="mt-2 text-sm text-muted">
              {school.province}، {school.city}
            </p>
            <p className="text-sm text-muted">
              {SCHOOL_TYPE_LABELS[school.schoolType] ?? school.schoolType} —{' '}
              {GENDER_TYPE_LABELS[school.genderType] ?? school.genderType}
            </p>
            <p className="mt-3 text-sm">{school.address}</p>
            {school.phoneNumber && (
              <p className="mt-1 text-sm" dir="ltr">
                {school.phoneNumber}
              </p>
            )}
            {(school.managerName || school.managerPhone) && (
              <p className="mt-1 text-sm text-muted">
                مدیر: {school.managerName ?? '—'}
                {school.managerPhone && (
                  <span dir="ltr" className="ms-2">
                    {school.managerPhone}
                  </span>
                )}
              </p>
            )}
            <dl className="mt-4 grid gap-3 rounded-2xl bg-surface-muted p-4 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-muted">نام کاربری مدیر</dt>
                <dd className="mt-1 font-mono font-bold" dir="ltr">
                  {school.managerUsername ?? '—'}
                </dd>
              </div>
              <div>
                <dt className="text-muted">وضعیت حساب مدیر</dt>
                <dd className="mt-1 font-bold">
                  {school.managerStatus === 'ACTIVE' ? 'فعال' : (school.managerStatus ?? '—')}
                </dd>
              </div>
              <div>
                <dt className="text-muted">ساعت شروع</dt>
                <dd className="mt-1 font-bold" dir="ltr">
                  {school.openingTime}
                </dd>
              </div>
              <div>
                <dt className="text-muted">ساعت‌های پایان</dt>
                <dd className="mt-1 font-bold" dir="ltr">
                  {school.closingTimes.join('، ') || school.closingTime}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-muted">مقطع‌ها و پایه‌های قابل ثبت‌نام</dt>
                <dd className="mt-2 flex flex-wrap gap-2">
                  {school.educationOptions.map((option) => (
                    <Badge key={option.level} tone="info">
                      {option.level}: {option.grades.join('، ')}
                    </Badge>
                  ))}
                </dd>
              </div>
            </dl>
            {school.latitude != null && school.longitude != null && (
              <div className="mt-4">
                <p className="mb-2 text-sm font-bold">موقعیت مدرسه</p>
                <LocationDisplay latitude={school.latitude} longitude={school.longitude} />
              </div>
            )}
            <div className="mt-4 flex gap-2 border-t border-border pt-4">
              <SchoolFormDialog mode="edit" school={school} />
              <ArchiveSchoolDialog schoolId={school.id} schoolName={school.name} />
            </div>
          </Card>
        ))}
      </div>
      {archivedSchools.length > 0 && (
        <>
          <h2 className="mt-8 text-lg font-black text-muted">مدارس بایگانی‌شده</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {archivedSchools.map((school) => (
              <Card key={school.id} variant="inset">
                <div className="flex items-start justify-between gap-3">
                  <p className="font-black text-muted">{school.name}</p>
                  <Badge tone="neutral">{school.status}</Badge>
                </div>
                <p className="mt-2 text-sm text-muted">
                  {school.province}، {school.city}
                </p>
                <div className="mt-4">
                  <ArchiveSchoolDialog archived schoolId={school.id} schoolName={school.name} />
                </div>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
