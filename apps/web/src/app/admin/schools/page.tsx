import { Breadcrumbs } from '@/components/navigation/breadcrumbs';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { getAdminSchools } from '@/features/admin-schools/admin-schools-api';
import { ArchiveSchoolDialog } from '@/features/admin-schools/archive-action';
import { SchoolFormDialog } from '@/features/admin-schools/school-form-dialog';

export const metadata = { title: 'مدارس' };
export const dynamic = 'force-dynamic';

export default async function SchoolsPage() {
  const { schools } = await getAdminSchools();
  const activeSchools = schools.filter((s) => s.status !== 'غیرفعال');
  const archivedSchools = schools.filter((s) => s.status === 'غیرفعال');

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: 'پنل مدیریت', href: '/admin/dashboard' }, { label: 'مدارس' }]} />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-bold text-primary">مدیریت مدارس</p>
          <h1 className="mt-1 text-2xl font-black sm:text-3xl">مدارس</h1>
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
            <p className="mt-2 text-sm text-muted">{school.city}، {school.district ?? school.province}</p>
            <p className="text-sm text-muted">{school.schoolType} — {school.genderType}</p>
            <p className="mt-3 text-sm">{school.address}</p>
            {school.phoneNumber && <p className="mt-1 text-sm" dir="ltr">{school.phoneNumber}</p>}
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
                <p className="mt-2 text-sm text-muted">{school.city}، {school.district ?? school.province}</p>
                <div className="mt-4"><ArchiveSchoolDialog archived schoolId={school.id} schoolName={school.name} /></div>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
