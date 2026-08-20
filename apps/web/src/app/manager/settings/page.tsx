import { Breadcrumbs } from '@/components/navigation/breadcrumbs';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { getManagerSettings } from '@/features/manager/manager-api';
export const metadata = { title: 'اطلاعات مدرسه' };
export default async function Page() {
  const s = await getManagerSettings();
  const school = s.schools.find((x) => x.id === s.primarySchoolId) ?? s.schools[0];
  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: 'پنل مدیر مدرسه', href: '/manager/dashboard' },
          { label: 'اطلاعات مدرسه' },
        ]}
      />
      <div>
        <h1 className="text-2xl font-black">اطلاعات مدرسه</h1>
        <p className="mt-2 text-sm text-muted">
          این صفحه فقط برای مشاهده است و هیچ اطلاعاتی قابل تغییر نیست.
        </p>
      </div>
      <div className="grid gap-5">
        {school && (
          <Card>
            <div className="flex justify-between">
              <h2 className="font-black">اطلاعات مدرسه</h2>
              <Badge tone={school.isActive ? 'success' : 'neutral'}>
                {school.isActive ? 'فعال' : 'غیرفعال'}
              </Badge>
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-4 text-sm md:grid-cols-3">
              <div>
                <dt className="text-muted">نام کاربری مدیر</dt>
                <dd className="font-bold" dir="ltr">
                  {s.manager.username}
                </dd>
              </div>
              <div>
                <dt className="text-muted">نام مدرسه</dt>
                <dd className="font-bold">{school.name}</dd>
              </div>
              <div>
                <dt className="text-muted">شهر / منطقه</dt>
                <dd className="font-bold">
                  {school.city ?? '—'} / {school.district ?? '—'}
                </dd>
              </div>
              <div className="col-span-2">
                <dt className="text-muted">نشانی</dt>
                <dd className="font-bold">{school.address ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-muted">تلفن مدرسه</dt>
                <dd className="font-bold">{school.phoneNumber ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-muted">استان</dt>
                <dd className="font-bold">{school.province ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-muted">نوع مدرسه</dt>
                <dd className="font-bold">{school.schoolType ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-muted">جنسیت</dt>
                <dd className="font-bold">{school.genderType ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-muted">ساعات</dt>
                <dd className="font-bold">
                  {school.openingTime ?? '—'} تا{' '}
                  {(school.closingTimes?.length ? school.closingTimes : [school.closingTime])
                    .filter(Boolean)
                    .join('، ') || '—'}
                </dd>
              </div>
              <div>
                <dt className="text-muted">موقعیت</dt>
                <dd className="font-bold" dir="ltr">
                  {school.latitude != null && school.longitude != null
                    ? `${school.latitude}, ${school.longitude}`
                    : '—'}
                </dd>
              </div>
              <div className="col-span-full">
                <dt className="text-muted">مقطع‌ها و پایه‌ها</dt>
                <dd className="mt-2 flex flex-wrap gap-2">
                  {school.educationLevels.map((x) => (
                    <Badge key={x.level}>
                      {x.level}: {x.grades.join('، ')}
                    </Badge>
                  ))}
                </dd>
              </div>
            </dl>
          </Card>
        )}
      </div>
    </div>
  );
}
