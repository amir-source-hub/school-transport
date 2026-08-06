import { Breadcrumbs } from '@/components/navigation/breadcrumbs';
import { Card } from '@/components/ui/card';
import { ArchiveStudentButton } from '@/features/students/archive-student-button';
import { StudentForm } from '@/features/students/student-form';
import { getStudent } from '@/features/students/students-api';
import { metadataFor } from '@/lib/route-metadata';

export const metadata = metadataFor('/parent/students/[studentId]');
export const dynamic = 'force-dynamic';

export default async function StudentPage({ params }: { params: Promise<{ studentId: string }> }) {
  const { studentId } = await params;
  const student = await getStudent(studentId);
  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: 'پنل خانواده', href: '/parent/dashboard' },
          { label: 'دانش‌آموزان', href: '/parent/students' },
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
      <div className="flex justify-end">
        <ArchiveStudentButton id={student.id} />
      </div>
    </div>
  );
}
