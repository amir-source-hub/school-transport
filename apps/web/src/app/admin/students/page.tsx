import { Breadcrumbs } from '@/components/navigation/breadcrumbs';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { getAdminStudents } from '@/features/admin-students/admin-students-api';

export const metadata = { title: 'دانش‌آموزان' };

export default async function StudentsPage() {
  const { students } = await getAdminStudents();

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: 'پنل مدیریت', href: '/admin/dashboard' }, { label: 'دانش‌آموزان' }]} />
      <div>
        <p className="text-sm font-bold text-primary">مدیریت دانش‌آموزان</p>
        <h1 className="mt-1 text-2xl font-black sm:text-3xl">دانش‌آموزان</h1>
      </div>
      <div className="grid gap-3 md:hidden">
        {students.map((student) => (
          <Card key={student.id}>
            <p className="font-black">{student.firstName} {student.lastName}</p>
            <p className="mt-1 text-sm text-muted">{student.schoolName ?? 'مدرسه ثبت نشده'} — {student.grade ?? '—'}</p>
            <Badge tone="success">{student.status}</Badge>
          </Card>
        ))}
      </div>
      <div className="hidden overflow-x-auto md:block" role="region" aria-label="فهرست دانش‌آموزان" tabIndex={0}>
        <table className="w-full min-w-[48rem] text-right text-sm">
          <thead>
            <tr className="border-b border-border text-muted">
              <th className="px-3 py-3">نام</th>
              <th className="px-3 py-3">نام خانوادگی</th>
              <th className="px-3 py-3">مدرسه</th>
              <th className="px-3 py-3">پایه</th>
              <th className="px-3 py-3">خانواده</th>
              <th className="px-3 py-3">وضعیت</th>
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
                <td className="px-3 py-3"><Badge tone="success">{student.status}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
