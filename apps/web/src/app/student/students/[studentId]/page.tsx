import { Breadcrumbs } from '@/components/navigation/breadcrumbs';
import { Card } from '@/components/ui/card';
import { ArchiveStudentButton } from '@/features/students/archive-student-button';
import { PhotoUploadCard } from '@/features/student-photos/photo-upload-card';
import { getMyPhotoUploads } from '@/features/student-photos/student-photos-api';
import { StudentForm } from '@/features/students/student-form';
import { getStudent } from '@/features/students/students-api';
import { metadataFor } from '@/lib/route-metadata';
import { getFamilyProfile } from '@/features/family-profile/family-api';
import { LocationDisplay } from '@/components/common/location-display';

export const metadata = metadataFor('/student/students/[studentId]');
export const dynamic = 'force-dynamic';

export default async function StudentPage({ params }: { params: Promise<{ studentId: string }> }) {
  const { studentId } = await params;
  const [student, photos, family] = await Promise.all([
    getStudent(studentId),
    getMyPhotoUploads(studentId),
    getFamilyProfile(),
  ]);
  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: 'پنل دانش‌آموز', href: '/student/dashboard' },
          { label: 'دانش‌آموزان', href: '/student/students' },
          { label: `${student.firstName} ${student.lastName}` },
        ]}
      />
      <div>
        <p className="text-sm font-bold text-primary">نمایه دانش‌آموز</p>
        <h1 className="mt-1 text-2xl font-black sm:text-3xl">
          {student.firstName} {student.lastName}
        </h1>
        <p className="mt-2 text-sm text-muted">{student.schoolName}</p>
      </div>
      <Card>
        <StudentForm
          student={student}
          schools={[{ id: student.schoolId, name: student.schoolName }]}
        />
      </Card>
      <Card>
        <PhotoUploadCard studentId={student.id} initialItems={photos} />
      </Card>
      {family.addresses.map((address) => (
        <Card key={address.id}>
          <h2 className="font-black">موقعیت {address.title}</h2>
          <p className="my-3 text-sm leading-7">
            {address.province}، {address.city}{address.district ? `، ${address.district}` : ''}، {address.streetAddress}
          </p>
          {address.latitude != null && address.longitude != null ? (
            <LocationDisplay latitude={address.latitude} longitude={address.longitude} />
          ) : (
            <p className="text-sm text-muted">مختصات این نشانی ثبت نشده است.</p>
          )}
        </Card>
      ))}
      <div className="flex justify-end">
        <ArchiveStudentButton id={student.id} />
      </div>
    </div>
  );
}
