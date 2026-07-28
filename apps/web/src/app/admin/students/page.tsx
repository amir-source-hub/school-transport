import { Breadcrumbs } from '@/components/navigation/breadcrumbs';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { getAdminStudents } from '@/features/admin-students/admin-students-api';
import { AdminStudentDialog, ArchiveStudentDialog } from '@/features/admin-students/student-actions';
import { getAdminFamilies } from '@/features/admin-families/admin-families-api';
import { getAdminSchools } from '@/features/admin-schools/admin-schools-api';

export const metadata = { title: 'دانش‌آموزان' };
export const dynamic = 'force-dynamic';

export default async function StudentsPage() {
  const [{ students }, { families }, { schools }] = await Promise.all([
    getAdminStudents(),
    getAdminFamilies(),
    getAdminSchools(),
  ]);
  const familyOptions = families.map((family) => ({ id: family.id, name: family.username }));
  const schoolOptions = schools
    .filter((school) => school.isActive)
    .map((school) => ({
      id: school.id,
      name: school.name,
      educationOptions: school.educationOptions,
    }));

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: 'پنل مدیریت', href: '/admin/dashboard' }, { label: 'دانش‌آموزان' }]} />
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
        <p className="text-sm font-bold text-primary">مدیریت دانش‌آموزان</p>
        <h1 className="mt-1 text-2xl font-black sm:text-3xl">دانش‌آموزان</h1>
        </div>
        <AdminStudentDialog families={familyOptions} schools={schoolOptions} />
      </div>
      <div className="grid gap-3 md:hidden">
        {students.map((student) => (
          <Card key={student.id}>
            <div className="flex items-start justify-between gap-3">
              <p className="font-black">{student.firstName} {student.lastName}</p>
              <Badge tone={student.isActive ? 'success' : 'neutral'}>{student.status}</Badge>
            </div>
            <p className="mt-1 text-sm text-muted">{student.schoolName ?? 'مدرسه ثبت نشده'} — {student.grade ?? '—'}</p>
            <p className="text-sm text-muted">خانواده: {student.familyName}</p>
            <div className="mt-3 flex gap-2 border-t border-border pt-3">
              <AdminStudentDialog families={familyOptions} schools={schoolOptions} student={student} />
              <ArchiveStudentDialog studentId={student.id} studentName={`${student.firstName} ${student.lastName}`} active={student.isActive} />
            </div>
          </Card>
        ))}
      </div>
      <div className="hidden overflow-x-auto md:block" role="region" aria-label="فهرست دانش‌آموزان" tabIndex={0}>
        <table className="w-full min-w-[56rem] text-right text-sm">
          <thead>
            <tr className="border-b border-border text-muted">
              <th className="px-3 py-3">نام</th>
              <th className="px-3 py-3">نام خانوادگی</th>
              <th className="px-3 py-3">مدرسه</th>
              <th className="px-3 py-3">پایه</th>
              <th className="px-3 py-3">خانواده</th>
              <th className="px-3 py-3">وضعیت</th>
              <th className="px-3 py-3">اقدام</th>
            </tr>
          </thead>
          <tbody>
            {students.map((student) => (
              <tr key={student.id} className="border-b border-border last:border-0">
                <td className="px-3 py-3 font-bold">{student.firstName}</td>
                <td className="px-3 py-3">{student.lastName}</td>
                <td className="px-3 py-3">{student.schoolName ?? '—'}</td>
                <td className="px-3 py-3">{student.grade ?? '—'}</td>
                <td className="px-3 py-3">{student.familyName}</td>
                <td className="px-3 py-3"><Badge tone={student.isActive ? 'success' : 'neutral'}>{student.status}</Badge></td>
                <td className="px-3 py-3">
                  <div className="flex gap-2">
                    <AdminStudentDialog families={familyOptions} schools={schoolOptions} student={student} />
                    <ArchiveStudentDialog studentId={student.id} studentName={`${student.firstName} ${student.lastName}`} active={student.isActive} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
