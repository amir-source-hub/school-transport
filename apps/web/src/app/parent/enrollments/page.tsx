import { Breadcrumbs } from '@/components/navigation/breadcrumbs';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { AcceptPriceButton, CancelEnrollmentButton, CreateEnrollmentForm } from '@/features/enrollment/enrollment-actions';
import { getEnrollmentPrices, getEnrollments } from '@/features/enrollment/enrollments-api';
import { getStudents } from '@/features/students/students-api';
import { getSchools } from '@/features/schools/schools-api';
import { formatIrr } from '@/lib/formatters';

export const metadata = { title: 'ثبت‌نام' };
export const dynamic = 'force-dynamic';

const statusLabels: Record<string, string> = {
  DRAFT: 'پیش‌نویس', SUBMITTED: 'ارسال‌شده', UNDER_REVIEW: 'در حال بررسی',
  NEEDS_CORRECTION: 'نیازمند اصلاح', APPROVED: 'تأییدشده', REJECTED: 'ردشده',
  CONTRACT_PENDING: 'در انتظار قرارداد', CONTRACT_READY: 'قرارداد آماده',
  CONTRACT_ACCEPTED: 'قرارداد پذیرفته‌شده', CANCELLED: 'لغوشده',
  ENROLLED: 'ثبت‌نام تکمیل‌شده',
};

export default async function EnrollmentsPage() {
  const [students, enrollments, { schools }] = await Promise.all([getStudents(), getEnrollments(), getSchools()]);
  const entries = await Promise.all(enrollments.map(async (enrollment) => ({
    enrollment,
    prices: ['APPROVED', 'CONTRACT_PENDING', 'CONTRACT_READY', 'CONTRACT_ACCEPTED'].includes(enrollment.registrationStatus)
      ? await getEnrollmentPrices(enrollment.id)
      : [],
  })));
  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: 'پنل خانواده', href: '/parent/dashboard' }, { label: 'ثبت‌نام' }]} />
      <div><p className="text-sm font-bold text-primary">درخواست سرویس</p><h1 className="mt-1 text-2xl font-black sm:text-3xl">ثبت‌نام و پیگیری</h1></div>
      <CreateEnrollmentForm schools={schools.map((school) => ({ id: school.id, name: school.name, city: school.city }))} />
      <div className="space-y-4">
        {entries.map(({ enrollment, prices }) => {
          const student = students.find(({ id }) => id === enrollment.studentId);
          const offered = prices.find(({ priceStatus }) => priceStatus === 'OFFERED');
          return (
            <Card key={enrollment.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div><h2 className="font-black">{student ? `${student.firstName} ${student.lastName}` : enrollment.studentId}</h2><p className="text-sm text-muted">{enrollment.academicYear} — {enrollment.serviceType === 'ROUND_TRIP' ? 'رفت و برگشت' : 'یک‌طرفه'}</p></div>
                <Badge tone={enrollment.registrationStatus === 'REJECTED' ? 'danger' : 'info'}>{statusLabels[enrollment.registrationStatus] ?? enrollment.registrationStatus}</Badge>
              </div>
              {offered && <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-primary-soft p-4"><p className="font-black">{formatIrr(offered.totalAmount)}</p><AcceptPriceButton enrollmentId={enrollment.id} priceId={offered.id} installmentAllowed={offered.installmentPaymentAllowed} /></div>}
              {['DRAFT', 'SUBMITTED', 'NEEDS_CORRECTION'].includes(enrollment.registrationStatus) && <div className="mt-4"><CancelEnrollmentButton id={enrollment.id} /></div>}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
