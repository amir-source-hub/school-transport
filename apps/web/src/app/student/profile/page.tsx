import { Breadcrumbs } from '@/components/navigation/breadcrumbs';
import { FamilyProfileForm } from '@/features/family-profile/family-profile-form';
import { FamilyOnboardingForm } from '@/features/family-profile/family-onboarding-form';
import { getFamilyProfile } from '@/features/family-profile/family-api';

export const metadata = { title: 'اطلاعات خانواده' };

export const dynamic = 'force-dynamic';

export default async function ProfilePage() {
  const profile = await getFamilyProfile();
  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: 'پنل دانش‌آموز', href: '/student/dashboard' },
          { label: 'اطلاعات خانواده' },
        ]}
      />
      <div>
        <p className="text-sm font-bold text-primary">پروفایل خانواده</p>
        <h1 className="mt-1 text-2xl font-black sm:text-3xl">اطلاعات خانواده</h1>
        <p className="mt-2 text-sm text-muted">
          ابتدا اطلاعات ثبت‌شده را بررسی کنید؛ برای تغییر هر بخش از دکمه ویرایش استفاده کنید.
        </p>
      </div>
      {profile.mother && profile.father && profile.addresses.length > 0 ? (
        <FamilyProfileForm profile={profile} />
      ) : (
        <FamilyOnboardingForm />
      )}
    </div>
  );
}
