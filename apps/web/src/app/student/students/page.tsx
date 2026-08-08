import { Breadcrumbs } from '@/components/navigation/breadcrumbs';
import { Badge } from '@/components/ui/badge';
import { ButtonLink } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { getStudents } from '@/features/students/students-api';
import { getStudentCapacity } from '@/features/students/students-api';

export const metadata = { title: 'دانش‌آموزان' };
export const dynamic = 'force-dynamic';

export default async function StudentsPage() {
  const [students, capacity] = await Promise.all([getStudents(), getStudentCapacity()]);
  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[{ label: 'پنل دانش‌آموز', href: '/student/dashboard' }, { label: 'دانش‌آموزان' }]}
      />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-bold text-primary">حساب خانواده</p>
          <h1 className="mt-1 text-2xl font-black sm:text-3xl">دانش‌آموزان</h1>
        </div>
        {capacity.remaining > 0 ? (
          <ButtonLink href="/student/enrollments">ثبت‌نام دانش‌آموز جدید</ButtonLink>
        ) : (
          <p className="text-sm font-bold text-muted">
            ظرفیت حساب تکمیل است؛ برای ثبت دانش‌آموز جدید ابتدا درخواست افزایش ظرفیت ثبت کنید.
          </p>
        )}
      </div>
      {students.length === 0 && (
        <Card>
          <p className="text-muted">هنوز دانش‌آموزی ثبت نشده است.</p>
        </Card>
      )}
      <div className="grid gap-4 md:grid-cols-2">
        {students.map((student) => (
          <Card key={student.id}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-black">
                  {student.firstName} {student.lastName}
                </h2>
                <p className="mt-1 text-sm text-muted">
                  {student.schoolName} — پایه {student.grade}
                </p>
              </div>
              <Badge tone="success">فعال</Badge>
            </div>
            <ButtonLink
              href={`/student/students/${student.id}`}
              variant="secondary"
              className="mt-5 w-full"
            >
              مشاهده و ویرایش
            </ButtonLink>
          </Card>
        ))}
      </div>
    </div>
  );
}
