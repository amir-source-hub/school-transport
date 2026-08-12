import { Breadcrumbs } from '@/components/navigation/breadcrumbs';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import {
  AcceptPriceButton,
  CancelEnrollmentButton,
  CreateEnrollmentForm,
} from '@/features/enrollment/enrollment-actions';
import { getEnrollmentPrices, getEnrollments } from '@/features/enrollment/enrollments-api';
import { getStudents } from '@/features/students/students-api';
import { getStudentCapacity } from '@/features/students/students-api';
import { StudentCapacityCard } from '@/features/students/student-capacity-card';
import { getSchools } from '@/features/schools/schools-api';
import { formatIrr } from '@/lib/formatters';
import { getFamilyProfile } from '@/features/family-profile/family-api';

export const metadata = { title: 'ثبت‌نام' };
export const dynamic = 'force-dynamic';

const statusLabels: Record<string, string> = {
  DRAFT: 'پیش‌نویس',
  SUBMITTED: 'ارسال‌شده',
  UNDER_REVIEW: 'در حال بررسی',
  NEEDS_CORRECTION: 'نیازمند اصلاح',
  APPROVED: 'تأییدشده',
  REJECTED: 'ردشده',
  CONTRACT_PENDING: 'در انتظار قرارداد',
  CONTRACT_READY: 'قرارداد آماده',
  CONTRACT_ACCEPTED: 'قرارداد پذیرفته‌شده',
  CANCELLED: 'لغوشده',
  ENROLLED: 'ثبت‌نام تکمیل‌شده',
};

export default async function EnrollmentsPage() {
  const [students, enrollments, { schools }, family, capacity] = await Promise.all([
    getStudents(),
    getEnrollments(),
    getSchools(),
    getFamilyProfile(),
    getStudentCapacity(),
  ]);
  const entries = await Promise.all(
    enrollments.map(async (enrollment) => ({
      enrollment,
      prices: ['APPROVED', 'CONTRACT_PENDING', 'CONTRACT_READY', 'CONTRACT_ACCEPTED'].includes(
        enrollment.registrationStatus,
      )
        ? await getEnrollmentPrices(enrollment.id)
        : [],
    })),
  );
  const enrolledStudentIds = new Set(enrollments.map((enrollment) => enrollment.studentId));
  const availableStudents = students.filter((student) => !enrolledStudentIds.has(student.id));
  const activeAddress = family.addresses.find((address) => address.isActive);
  const activeEmergency = family.emergencyContacts.find((contact) => contact.isActive);
  const primaryParent =
    [family.guardian, family.father, family.mother].find((parent) => parent?.isPrimaryContact) ??
    family.guardian ??
    family.father ??
    family.mother;
  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[{ label: 'پنل دانش‌آموز', href: '/student/dashboard' }, { label: 'ثبت‌نام' }]}
      />
      <div>
        <p className="text-sm font-bold text-primary">درخواست سرویس</p>
        <h1 className="mt-1 text-2xl font-black sm:text-3xl">ثبت‌نام و پیگیری</h1>
      </div>
      <StudentCapacityCard />
      {capacity.remaining === 0 ? (
        <Card>
          <h2 className="text-lg font-black">ظرفیت حساب تکمیل است</h2>
          <p className="mt-2 text-sm leading-7 text-muted">
            امکان ثبت‌نام دانش‌آموز جدید وجود ندارد؛ ظرفیت فعال حساب به‌طور کامل استفاده شده است.
            برای ثبت دانش‌آموز دیگر، ابتدا از طریق کارت «ظرفیت حساب خانواده» درخواست افزایش ظرفیت
            ثبت کنید.
          </p>
        </Card>
      ) : (
        <CreateEnrollmentForm
          schools={schools.map((school) => ({
            id: school.id,
            name: school.name,
            city: school.city,
            educationOptions: school.educationOptions,
          }))}
          savedParents={{ father: family.father, mother: family.mother }}
          existingStudents={availableStudents}
          guardianPhone={primaryParent?.phoneNumber ?? undefined}
          capacityRemaining={capacity.remaining}
          defaults={{
            address: activeAddress,
            emergencyContact: activeEmergency,
            guardian: primaryParent
              ? {
                  firstName: primaryParent.firstName,
                  lastName: primaryParent.lastName,
                  nationalId: primaryParent.nationalId,
                  relationshipType:
                    (family.guardian?.relationshipType as 'FATHER' | 'MOTHER' | 'OTHER') ??
                    (primaryParent.parentType === 'MOTHER'
                      ? 'MOTHER'
                      : primaryParent.parentType === 'FATHER'
                        ? 'FATHER'
                        : 'OTHER'),
                  relationshipDescription: family.guardian?.relationshipDescription,
                }
              : undefined,
          }}
        />
      )}{' '}
      <div className="space-y-4">
        {entries.map(({ enrollment, prices }) => {
          const student = students.find(({ id }) => id === enrollment.studentId);
          const offered = prices.find(({ priceStatus }) => priceStatus === 'OFFERED');
          return (
            <Card key={enrollment.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-black">
                    {student ? `${student.firstName} ${student.lastName}` : enrollment.studentId}
                  </h2>
                  <p className="text-sm text-muted">
                    {enrollment.academicYear} —{' '}
                    {(
                      {
                        BUS: 'اتوبوس',
                        MINIBUS: 'مینی‌بوس',
                        CAR: 'خودرو سواری',
                        VAN: 'ون',
                        ROUND_TRIP: 'رفت و برگشت',
                        ONE_WAY: 'یک‌طرفه',
                      } as Record<string, string>
                    )[enrollment.serviceType] ?? enrollment.serviceType}
                  </p>
                </div>
                <Badge tone={enrollment.registrationStatus === 'REJECTED' ? 'danger' : 'info'}>
                  {statusLabels[enrollment.registrationStatus] ?? enrollment.registrationStatus}
                </Badge>
              </div>
              {offered && (
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-primary-soft p-4">
                  <p className="font-black">{formatIrr(offered.totalAmount)}</p>
                  <AcceptPriceButton
                    enrollmentId={enrollment.id}
                    priceId={offered.id}
                    installmentAllowed={offered.installmentPaymentAllowed}
                  />
                </div>
              )}
              {['DRAFT', 'SUBMITTED', 'NEEDS_CORRECTION'].includes(
                enrollment.registrationStatus,
              ) && (
                <div className="mt-4">
                  <CancelEnrollmentButton id={enrollment.id} />
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
