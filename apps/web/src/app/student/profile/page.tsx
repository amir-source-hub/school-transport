import { Breadcrumbs } from '@/components/navigation/breadcrumbs';
import { FamilyProfileForm } from '@/features/family-profile/family-profile-form';
import { FamilyOnboardingForm } from '@/features/family-profile/family-onboarding-form';
import { getFamilyProfile } from '@/features/family-profile/family-api';
import { getStudents } from '@/features/students/students-api';
import { getMyPhotoUploads, getPhotoViewUrl } from '@/features/student-photos/student-photos-api';

export const metadata = { title: 'اطلاعات خانواده' };

export const dynamic = 'force-dynamic';

export default async function ProfilePage() {
  const [profile, students] = await Promise.all([getFamilyProfile(), getStudents()]);
  const studentsWithPhotos = await Promise.all(
    students.map(async (student) => {
      const uploads = await getMyPhotoUploads(student.id).catch(() => []);
      const approved = uploads.find((upload) => upload.status === 'APPROVED');
      const photo = approved ? await getPhotoViewUrl(approved.uploadId).catch(() => null) : null;
      return { ...student, photoUrl: photo?.viewUrl ?? null };
    }),
  );
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
      {(profile.guardian || profile.mother || profile.father) && profile.addresses.length > 0 ? (
        <FamilyProfileForm profile={profile} students={studentsWithPhotos} />
      ) : (
        <FamilyOnboardingForm />
      )}
    </div>
  );
}
