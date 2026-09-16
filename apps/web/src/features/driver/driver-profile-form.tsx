import type { DriverProfile } from './driver-api';
import { driverValueLabel } from '@/features/admin-drivers/driver-display';
const fields = [
  ['firstName', 'نام'],
  ['lastName', 'نام خانوادگی'],
  ['fatherName', 'نام پدر'],
  ['nationalId', 'کد ملی'],
  ['phoneNumber', 'شماره همراه اصلی'],
  ['secondaryPhoneNumber', 'شماره همراه دوم'],
  ['homePhoneNumber', 'تلفن منزل'],
  ['emergencyPhoneNumber', 'شماره اضطراری'],
  ['gender', 'جنسیت'],
  ['education', 'تحصیلات'],
  ['streetAddress', 'نشانی'],
  ['postalCode', 'کد پستی'],
  ['province', 'استان'],
  ['city', 'شهر'],
  ['municipalityDistrict', 'منطقه شهرداری'],
  ['referrerName', 'معرف'],
  ['referrerPhoneNumber', 'شماره معرف'],
] as const;
export function DriverProfileForm({ profile }: { profile: DriverProfile }) {
  const d = profile.driver;
  return (
    <section className="rounded-2xl border border-border bg-surface-paper p-5">
      <h2 className="font-black">مشخصات ثبت‌شده</h2>
      <p className="mt-1 text-sm text-muted">برای اصلاح هر مورد با مدیریت سامانه تماس بگیرید.</p>
      <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
        {fields.map(([key, label]) => (
          <div key={key}>
            <dt className="text-xs text-muted">{label}</dt>
            <dd className="font-bold">
              {['gender', 'education'].includes(key)
                ? driverValueLabel(d[key])
                : String(d[key] ?? '—')}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
