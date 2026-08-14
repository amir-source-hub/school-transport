import { Breadcrumbs } from '@/components/navigation/breadcrumbs';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { CredentialBanner } from '@/features/manager/credential-banner';
import { CredentialForm } from '@/features/manager/credential-form';
import { getManagerSettings } from '@/features/manager/manager-api';
import { formatJalaliDateTime } from '@/lib/formatters';
export const metadata = { title: 'تنظیمات' };
function maskPhone(x: string) {
  return x.length > 4 ? `${x.slice(0, 4)}•••${x.slice(-4)}` : x;
}
export default async function Page() {
  const s = await getManagerSettings();
  const school = s.schools.find((x) => x.id === s.primarySchoolId) ?? s.schools[0];
  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[{ label: 'پنل مدیر مدرسه', href: '/manager/dashboard' }, { label: 'تنظیمات' }]}
      />
      <CredentialBanner required={s.manager.mustChangeCredentials} />
      <h1 className="text-2xl font-black">تنظیمات حساب و مدرسه</h1>
      <div className="grid gap-5 xl:grid-cols-2">
        <Card>
          <h2 className="font-black">اطلاعات مدیر</h2>
          <dl className="mt-4 grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-muted">نام</dt>
              <dd className="font-bold">
                {s.manager.firstName} {s.manager.lastName}
              </dd>
            </div>
            <div>
              <dt className="text-muted">نام کاربری</dt>
              <dd className="font-bold">{s.manager.username}</dd>
            </div>
            <div>
              <dt className="text-muted">همراه</dt>
              <dd className="font-bold" dir="ltr">
                {maskPhone(s.manager.phoneNumber)}
              </dd>
            </div>
            <div>
              <dt className="text-muted">آخرین ورود</dt>
              <dd className="font-bold">
                {s.manager.lastLoginAt ? formatJalaliDateTime(s.manager.lastLoginAt) : '—'}
              </dd>
            </div>
          </dl>
        </Card>
        {school && (
          <Card>
            <div className="flex justify-between">
              <h2 className="font-black">اطلاعات مدرسه</h2>
              <Badge tone={school.isActive ? 'success' : 'neutral'}>
                {school.isActive ? 'فعال' : 'غیرفعال'}
              </Badge>
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-4 text-sm">
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
                <dt className="text-muted">ساعات</dt>
                <dd className="font-bold">
                  {school.openingTime ?? '—'} تا {school.closingTime ?? '—'}
                </dd>
              </div>
            </dl>
          </Card>
        )}
        <Card className="xl:col-span-2">
          <h2 className="text-lg font-black">تغییر اطلاعات ورود</h2>
          <p className="mt-2 text-sm text-muted">
            برای حفظ امنیت اطلاعات دانش‌آموزان از رمز منحصربه‌فرد استفاده کنید.
          </p>
          <div className="mt-5 max-w-xl">
            <CredentialForm username={s.manager.username} />
          </div>
        </Card>
      </div>
    </div>
  );
}
