import { Breadcrumbs } from '@/components/navigation/breadcrumbs';
import { Card } from '@/components/ui/card';
import { DriverProfileForm } from '@/features/driver/driver-profile-form';
import { getDriverProfile } from '@/features/driver/driver-api';
import { driverValueLabel, IranianPlate } from '@/features/admin-drivers/driver-display';
import { formatJalaliDate } from '@/lib/formatters';
export const metadata = { title: 'اطلاعات من و خودرو' };
export default async function Page() {
  const profile = await getDriverProfile();
  const v = profile.vehicle;
  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: 'پنل راننده', href: '/driver/dashboard' },
          { label: 'اطلاعات من و خودرو' },
        ]}
      />
      <header>
        <p className="text-sm font-bold text-coral">پروفایل راننده</p>
        <h1 className="text-2xl font-black">اطلاعات من و خودرو</h1>
        <p className="mt-2 text-sm text-muted">
          این اطلاعات فقط توسط مدیریت سامانه قابل ویرایش است.
        </p>
      </header>
      <DriverProfileForm profile={profile} />
      <Card>
        <h2 className="font-black">مشخصات خودرو</h2>
        {v ? (
          <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
            {[
              ['نوع خودرو', driverValueLabel(v.vehicleType)],
              ['سیستم', v.system],
              ['سال ساخت', String(v.modelYear)],
              ['کاربری', driverValueLabel(v.usageType)],
              ['مالکیت', driverValueLabel(v.ownershipType)],
              ['انقضای بیمه', formatJalaliDate(v.insuranceExpiresAt)],
              ['انقضای معاینه فنی', formatJalaliDate(v.technicalInspectionExpiresAt)],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="text-xs text-muted">{label}</dt>
                <dd className="font-bold">{value}</dd>
              </div>
            ))}
            <div>
              <dt className="mb-2 text-xs text-muted">پلاک</dt>
              <dd>
                <IranianPlate value={v.plateNumber} />
              </dd>
            </div>
          </dl>
        ) : (
          <p className="mt-4 text-sm text-muted">خودرویی ثبت نشده است.</p>
        )}
      </Card>
    </div>
  );
}
