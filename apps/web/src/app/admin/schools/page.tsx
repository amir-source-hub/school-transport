import { Breadcrumbs } from '@/components/navigation/breadcrumbs';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { getAdminSchools } from '@/features/admin-schools/admin-schools-api';

export const metadata = { title: 'مدارس' };

export default async function SchoolsPage() {
  const { schools } = await getAdminSchools();

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: 'پنل مدیریت', href: '/admin/dashboard' }, { label: 'مدارس' }]} />
      <div>
        <p className="text-sm font-bold text-primary">مدیریت مدارس</p>
        <h1 className="mt-1 text-2xl font-black sm:text-3xl">مدارس</h1>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {schools.map((school) => (
          <Card key={school.id}>
            <div className="flex items-start justify-between gap-3">
              <p className="font-black">{school.name}</p>
              <Badge tone={school.status === 'فعال' ? 'success' : 'neutral'}>{school.status}</Badge>
            </div>
            <p className="mt-2 text-sm text-muted">{school.city}، {school.district ?? school.province}</p>
            <p className="text-sm text-muted">{school.schoolType} — {school.genderType}</p>
            <p className="mt-3 text-sm">{school.address}</p>
            {school.phoneNumber && <p className="mt-1 text-sm" dir="ltr">{school.phoneNumber}</p>}
          </Card>
        ))}
      </div>
    </div>
  );
}
