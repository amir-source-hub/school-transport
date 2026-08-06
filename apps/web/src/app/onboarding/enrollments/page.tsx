import { Breadcrumbs } from '@/components/navigation/breadcrumbs';
import { getSchools } from '@/features/schools/schools-api';
import { CreateEnrollmentForm } from '@/features/enrollment/enrollment-actions';

export const metadata = { title: 'تکمیل ثبت‌نام سرویس' };
export const dynamic = 'force-dynamic';

export default async function OnboardingEnrollmentsPage() {
  const { schools } = await getSchools();
  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[{ label: 'خانه', href: '/' }, { label: 'تکمیل ثبت‌نام' }]}
      />
      <div>
        <p className="text-sm font-bold text-primary">مرحله نخست ورود شما</p>
        <h1 className="mt-1 text-2xl font-black sm:text-3xl">تکمیل ثبت‌نام سرویس مدرسه</h1>
        <p className="mt-3 text-sm leading-7 text-muted">
          برای فعال شدن حساب دانش‌آموزی، مشخصات، نشانی، مدرسه، قرارداد و پیش‌پرداخت را تکمیل
          کنید. پس از تأیید پرداخت، پنل خانواده فعال می‌شود.
        </p>
      </div>
      <CreateEnrollmentForm
        mode="onboarding"
        schools={schools.map((school) => ({
          id: school.id,
          name: school.name,
          city: school.city,
          educationOptions: school.educationOptions,
        }))}
        savedParents={{ father: null, mother: null }}
        existingStudents={[]}
        defaults={{}}
      />
    </div>
  );
}