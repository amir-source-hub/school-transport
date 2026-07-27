import { getContracts } from '@/features/finance/contracts-api';
import { getPayments } from '@/features/finance/payments-api';
import { getEnrollments } from '@/features/enrollment/enrollments-api';
import { getNotifications } from '@/features/notifications/notifications-api';
import {
  ParentDashboard,
  type StudentDashboard,
} from '@/features/parent-dashboard/parent-dashboard';
import { getStudents } from '@/features/students/students-api';
import { formatIrr, formatJalaliDate } from '@/lib/formatters';

export const metadata = { title: 'نمای کلی خانواده' };
export const dynamic = 'force-dynamic';

const statusLabel: Record<string, string> = {
  DRAFT: 'پیش‌نویس',
  SUBMITTED: 'در انتظار بررسی',
  UNDER_REVIEW: 'در حال بررسی',
  NEEDS_CORRECTION: 'نیازمند اصلاح',
  APPROVED: 'در انتظار قیمت',
  CONTRACT_PENDING: 'در انتظار قرارداد',
  CONTRACT_READY: 'قرارداد آماده',
  CONTRACT_ACCEPTED: 'قرارداد پذیرفته‌شده',
  REJECTED: 'ردشده',
  CANCELLED: 'لغوشده',
  ENROLLED: 'خدمت فعال',
};

export default async function ParentDashboardPage() {
  const [students, enrollments, contracts, payments, notifications] = await Promise.all([
    getStudents(),
    getEnrollments(),
    getContracts(),
    getPayments(),
    getNotifications(),
  ]);
  const dashboards: StudentDashboard[] = students.map((student) => {
    const enrollment = enrollments.find((item) => item.studentId === student.id);
    const contract = enrollment && contracts.find((item) => item.registrationId === enrollment.id);
    const payment = payments.find((item) => item.studentId === student.id);
    const nextItem = payment?.items.find((item) => item.itemStatus !== 'PAID');
    const status = enrollment?.registrationStatus ?? 'DRAFT';
    return {
      id: student.id,
      name: `${student.firstName} ${student.lastName}`,
      schoolAndGrade: `${student.schoolName}، پایه ${student.grade ?? '—'}`,
      academicYear: enrollment?.academicYear ?? 'درخواستی ثبت نشده',
      enrollmentCode: status,
      enrollmentStatus: statusLabel[status] ?? status,
      enrollmentTone: status === 'REJECTED' || status === 'NEEDS_CORRECTION' ? 'danger' : 'info',
      nextAction: !enrollment
        ? 'برای این دانش‌آموز درخواست سرویس ثبت کنید.'
        : status === 'APPROVED'
          ? 'منتظر اعلام قیمت مدیریت باشید.'
          : status === 'CONTRACT_READY'
            ? 'قرارداد را بررسی و تعیین تکلیف کنید.'
            : 'وضعیت درخواست را در بخش ثبت‌نام دنبال کنید.',
      warning:
        enrollment?.rejectionReason ??
        (status === 'NEEDS_CORRECTION' ? 'اطلاعات درخواست نیازمند اصلاح است.' : null),
      contractStatus: contract?.contractStatus ?? 'هنوز صادر نشده',
      paymentSummary: payment
        ? `${formatIrr(payment.items.reduce((sum, item) => sum + item.paidAmount, 0))} پرداخت‌شده`
        : 'برنامه پرداخت هنوز ایجاد نشده',
      nextPayment: nextItem
        ? formatIrr(nextItem.amount)
        : payment
          ? 'تسویه‌شده'
          : 'پس از پذیرش قرارداد مشخص می‌شود',
      notifications: [
        ...(nextItem?.dueDate ? [`سررسید پرداخت بعدی: ${formatJalaliDate(nextItem.dueDate)}`] : []),
        ...notifications.slice(0, 3).map((item) => item.message),
      ].slice(0, 4),
    };
  });
  return <ParentDashboard students={dashboards} />;
}
