import { Breadcrumbs } from '@/components/navigation/breadcrumbs';
import { Pagination } from '@/components/navigation/pagination';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { AutoSubmitForm } from '@/components/forms/auto-submit-form';
import Link from 'next/link';
import {
  getAdminStudents,
  type AdminStudentListParams,
} from '@/features/admin-students/admin-students-api';
import { getAdminLimitRequests } from '@/features/admin-students/admin-students-api';
import { AdminLimitRequestSection } from '@/features/admin-students/admin-limit-request-section';
import {
  AdminStudentDialog,
  ArchiveStudentDialog,
} from '@/features/admin-students/student-actions';
import { StudentEditDialog } from '@/features/admin-students/student-edit-dialog';
import { getAdminFamilies } from '@/features/admin-families/admin-families-api';
import { getAdminSchools } from '@/features/admin-schools/admin-schools-api';

export const metadata = { title: 'دانش‌آموزان' };
export const dynamic = 'force-dynamic';

const PAGE_SIZE = 10;

type SearchParams = Promise<{
  archive?: string;
  sort?: string;
  direction?: string;
  page?: string;
}>;

export default async function StudentsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const archive = ['active', 'archived'].includes(params.archive ?? '')
    ? (params.archive as 'active' | 'archived')
    : 'all';
  const sort = ['studentName', 'schoolName', 'createdAt'].includes(params.sort ?? '')
    ? (params.sort as 'studentName' | 'schoolName' | 'createdAt')
    : 'createdAt';
  const direction = params.direction === 'asc' ? 'asc' : 'desc';
  const page = Math.max(1, Number.parseInt(params.page ?? '1', 10) || 1);

  const query: AdminStudentListParams = { archive, sort, direction, page, pageSize: PAGE_SIZE };
  const [{ students, pagination }, { families }, { schools }, limitRequests] = await Promise.all([
    getAdminStudents(query),
    getAdminFamilies(),
    getAdminSchools(),
    getAdminLimitRequests(),
  ]);
  const familyOptions = families.map((family) => ({ id: family.id, name: family.username }));
  const schoolOptions = schools
    .filter((school) => school.isActive)
    .map((school) => ({
      id: school.id,
      name: school.name,
      educationOptions: school.educationOptions,
    }));

  const getPageHref = (nextPage: number) => {
    const next = new URLSearchParams();
    if (archive !== 'all') next.set('archive', archive);
    if (sort !== 'createdAt') next.set('sort', sort);
    if (direction !== 'desc') next.set('direction', direction);
    next.set('page', String(nextPage));
    return `/admin/students?${next.toString()}`;
  };

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[{ label: 'پنل مدیریت', href: '/admin/dashboard' }, { label: 'دانش‌آموزان' }]}
      />
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-primary">مدیریت دانش‌آموزان</p>
          <h1 className="mt-1 text-2xl font-black sm:text-3xl">دانش‌آموزان</h1>
        </div>
        <AdminStudentDialog families={familyOptions} schools={schoolOptions} />
      </div>
      <Card>
        <AutoSubmitForm method="get" className="grid gap-4 sm:grid-cols-[1fr_1fr_1fr] md:max-w-2xl">
          <label className="text-sm font-bold">
            وضعیت
            <select
              name="archive"
              defaultValue={archive}
              className="mt-2 min-h-12 w-full rounded-[var(--radius-control)] border border-border bg-surface px-3 text-sm"
            >
              <option value="all">همه</option>
              <option value="active">فعال</option>
              <option value="archived">بایگانی‌شده</option>
            </select>
          </label>
          <label className="text-sm font-bold">
            مرتب‌سازی
            <select
              name="sort"
              defaultValue={sort}
              className="mt-2 min-h-12 w-full rounded-[var(--radius-control)] border border-border bg-surface px-3 text-sm"
            >
              <option value="createdAt">جدیدترین</option>
              <option value="studentName">نام دانش‌آموز</option>
              <option value="schoolName">مدرسه</option>
            </select>
          </label>
          <label className="text-sm font-bold">
            جهت
            <select
              name="direction"
              defaultValue={direction}
              className="mt-2 min-h-12 w-full rounded-[var(--radius-control)] border border-border bg-surface px-3 text-sm"
            >
              <option value="desc">نزولی</option>
              <option value="asc">صعودی</option>
            </select>
          </label>
        </AutoSubmitForm>
      </Card>
      {students.length === 0 ? (
        <Card>
          <p className="font-black">دانش‌آموزی یافت نشد</p>
          <p className="mt-2 text-sm text-muted">فیلتر دیگری را امتحان کنید.</p>
        </Card>
      ) : (
        <>
          <div className="grid gap-3 md:hidden">
            {students.map((student) => (
              <Card key={student.id}>
                <div className="flex items-start justify-between gap-3">
                  <Link href={`/admin/students/${student.id}`} className="font-black text-primary hover:underline">
                    {student.firstName} {student.lastName}
                  </Link>
                  <Badge tone={student.isActive ? 'success' : 'neutral'}>{student.status}</Badge>
                </div>
                <p className="mt-1 text-sm text-muted">
                  {student.schoolName ?? 'مدرسه ثبت نشده'} — {student.grade ?? '—'}
                </p>
                <p className="text-sm text-muted">
                  خانواده:{' '}
                  <Link
                    href={`/admin/families/${student.userId}`}
                    className="font-bold text-primary hover:underline"
                  >
                    {student.familyName}
                  </Link>
                </p>
                <div className="mt-3 flex gap-2 border-t border-border pt-3">
                  <StudentEditDialog
                    studentId={student.id}
                    studentName={`${student.firstName} ${student.lastName}`}
                    schools={schoolOptions}
                  />
                  <ArchiveStudentDialog
                    studentId={student.id}
                    studentName={`${student.firstName} ${student.lastName}`}
                    active={student.isActive}
                  />
                </div>
              </Card>
            ))}
          </div>
          <div
            className="hidden overflow-x-auto md:block"
            role="region"
            aria-label="فهرست دانش‌آموزان"
            tabIndex={0}
          >
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
                    <td className="px-3 py-3 font-bold">
                      <Link href={`/admin/students/${student.id}`} className="text-primary hover:underline">
                        {student.firstName}
                      </Link>
                    </td>
                    <td className="px-3 py-3">{student.lastName}</td>
                    <td className="px-3 py-3">{student.schoolName ?? '—'}</td>
                    <td className="px-3 py-3">{student.grade ?? '—'}</td>
                    <td className="px-3 py-3">
                      <Link
                        href={`/admin/families/${student.userId}`}
                        className="font-bold text-primary hover:underline"
                      >
                        {student.familyName}
                      </Link>
                    </td>
                    <td className="px-3 py-3">
                      <Badge tone={student.isActive ? 'success' : 'neutral'}>
                        {student.status}
                      </Badge>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex gap-2">
                        <StudentEditDialog
                          studentId={student.id}
                          studentName={`${student.firstName} ${student.lastName}`}
                          schools={schoolOptions}
                        />
                        <ArchiveStudentDialog
                          studentId={student.id}
                          studentName={`${student.firstName} ${student.lastName}`}
                          active={student.isActive}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            currentPage={pagination.page}
            totalPages={pagination.totalPages}
            getHref={getPageHref}
          />
        </>
      )}
      <AdminLimitRequestSection initialRequests={limitRequests} />
    </div>
  );
}
