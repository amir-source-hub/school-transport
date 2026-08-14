import { Breadcrumbs } from '@/components/navigation/breadcrumbs';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { getManagerStudent, getManagerStudentPhoto } from '@/features/manager/manager-api';
export const metadata = { title: 'جزئیات دانش‌آموز' };
export default async function Page({ params }: { params: Promise<{ studentId: string }> }) {
  const { studentId } = await params;
  const s = await getManagerStudent(studentId);
  const photo = s.hasApprovedPhoto ? await getManagerStudentPhoto(studentId) : null;
  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: 'پنل مدیر مدرسه', href: '/manager/dashboard' },
          { label: 'دانش‌آموزان', href: '/manager/students' },
          { label: `${s.firstName} ${s.lastName}` },
        ]}
      />
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-4">
          {photo ? (
            // The URL is a short-lived, manager-scoped private-storage URL returned by the API.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photo.viewUrl} alt="" className="size-20 rounded-2xl object-cover" />
          ) : (
            <span
              className="grid size-20 place-items-center rounded-2xl bg-primary-soft text-xl font-black text-primary"
              aria-hidden="true"
            >
              {s.firstName.slice(0, 1)}
              {s.lastName.slice(0, 1)}
            </span>
          )}
          <div>
            <h1 className="text-2xl font-black">
              {s.firstName} {s.lastName}
            </h1>
            <p className="mt-2 text-sm text-muted">{s.school.name}</p>
          </div>
        </div>
        <Badge tone={s.isActive ? 'success' : 'neutral'}>{s.isActive ? 'فعال' : 'غیرفعال'}</Badge>
      </header>
      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <h2 className="font-black">مشخصات دانش‌آموز</h2>
          <dl className="mt-4 grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-muted">کد ملی</dt>
              <dd className="mt-1 font-mono font-bold">{s.nationalIdMasked ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-muted">کد دانش‌آموزی</dt>
              <dd className="mt-1 font-bold">{s.studentCode ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-muted">مقطع</dt>
              <dd className="mt-1 font-bold">{s.educationLevel ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-muted">پایه</dt>
              <dd className="mt-1 font-bold">{s.grade ?? '—'}</dd>
            </div>
          </dl>
        </Card>
        <Card>
          <h2 className="font-black">سرپرستان</h2>
          <div className="mt-4 space-y-3">
            {s.guardians.map((g) => (
              <div
                key={g.id}
                className="flex justify-between rounded-xl bg-surface-muted p-3 text-sm"
              >
                <span className="font-bold">{g.name}</span>
                {g.isPrimaryContact && <Badge tone="info">سرپرست اصلی</Badge>}
              </div>
            ))}
          </div>
        </Card>
        <Card className="lg:col-span-2">
          <div className="flex justify-between">
            <h2 className="font-black">وضعیت سرویس</h2>
            <Badge tone="warning">اطلاعات راننده آزمایشی است</Badge>
          </div>
          {s.enrollmentSummary ? (
            <dl className="mt-4 grid gap-4 sm:grid-cols-3 text-sm">
              <div>
                <dt className="text-muted">وضعیت ثبت‌نام</dt>
                <dd className="font-bold">{s.enrollmentSummary.registrationStatus}</dd>
              </div>
              <div>
                <dt className="text-muted">نوع سرویس</dt>
                <dd className="font-bold">{s.enrollmentSummary.serviceType}</dd>
              </div>
              <div>
                <dt className="text-muted">سال تحصیلی</dt>
                <dd className="font-bold">{s.enrollmentSummary.academicYear}</dd>
              </div>
            </dl>
          ) : (
            <p className="mt-4 text-sm text-muted">برای این دانش‌آموز سرویس فعالی ثبت نشده است.</p>
          )}
        </Card>
      </div>
    </div>
  );
}
