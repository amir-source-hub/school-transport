import { getContracts } from '@/features/finance/contracts-api';
import { getOfflineSubmissions, getPayments } from '@/features/finance/payments-api';
import { getEnrollments } from '@/features/enrollment/enrollments-api';
import { getNotifications } from '@/features/notifications/notifications-api';
import {
  StudentDashboard,
  type StudentDashboard as StudentDashboardModel,
} from '@/features/student-dashboard/student-dashboard';
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

export default async function StudentDashboardPage() {
  const [students, enrollments, contracts, payments, notifications, offlineSubmissions] =
    await Promise.all([
      getStudents(),
      getEnrollments(),
      getContracts(),
      getPayments(),
      getNotifications(),
      getOfflineSubmissions(),
    ]);
  const dashboards: StudentDashboardModel[] = students.map((student) => {
    const enrollment = enrollments.find((item) => item.studentId === student.id);
    const contract = enrollment && contracts.find((item) => item.registrationId === enrollment.id);
    const payment = payments.find((item) => item.studentId === student.id);
    const prepayment = payment?.items.find((item) => item.itemType === 'PREPAYMENT');
    const prepaymentSubmission = prepayment
      ? offlineSubmissions.find((submission) => submission.paymentScheduleItemId === prepayment.id)
      : undefined;
    const nextItem = payment?.items.find((item) => item.itemStatus !== 'PAID');
    const status = enrollment?.registrationStatus ?? 'DRAFT';
    const lifecycleEvents = [
      ...(payment?.transactions.some((item) => item.transactionStatus === 'SUCCESS')
        ? ['پرداخت موفق برای این دانش‌آموز ثبت شده است.']
        : []),
      ...(contract
        ? [
            contract.contractStatus === 'ACCEPTED'
              ? 'قرارداد این دانش‌آموز پذیرفته شده است.'
              : 'قرارداد این دانش‌آموز صادر شده است.',
          ]
        : []),
      ...(enrollment
        ? [`درخواست سرویس با وضعیت «${statusLabel[status] ?? status}» ثبت شده است.`]
        : []),
      'پروفایل دانش‌آموز در پنل دانش‌آموز ایجاد شده است.',
    ];
    const recentEvents = [
      ...(nextItem?.dueDate ? [`سررسید پرداخت بعدی: ${formatJalaliDate(nextItem.dueDate)}`] : []),
      ...notifications.items.map((item) => item.message),
      ...lifecycleEvents,
    ].filter((event, index, items) => items.indexOf(event) === index);
    return {
      id: student.id,
      name: `${student.firstName} ${student.lastName}`,
      schoolAndGrade: `${student.schoolName}، پایه ${student.grade ?? '—'}`,
      academicYear: enrollment?.academicYear ?? 'درخواستی ثبت نشده',
      enrollmentCode: status,
      enrollmentStatus:
        prepaymentSubmission?.status === 'PENDING_REVIEW'
          ? 'رسید پیش‌پرداخت در انتظار بررسی'
          : prepaymentSubmission?.status === 'REJECTED'
            ? 'رسید پیش‌پرداخت نیازمند اصلاح'
            : status === 'CONTRACT_ACCEPTED' && prepayment?.itemStatus !== 'PAID'
              ? 'در انتظار پرداخت پیش‌پرداخت'
              : (statusLabel[status] ?? status),
      enrollmentTone:
        status === 'REJECTED' ||
        status === 'NEEDS_CORRECTION' ||
        prepaymentSubmission?.status === 'REJECTED'
          ? 'danger'
          : 'info',
      nextAction: !enrollment
        ? 'برای این دانش‌آموز درخواست سرویس ثبت کنید.'
        : status === 'APPROVED'
          ? 'منتظر اعلام قیمت مدیریت باشید.'
          : status === 'CONTRACT_READY'
            ? 'قرارداد را بررسی و تعیین تکلیف کنید.'
            : prepaymentSubmission?.status === 'PENDING_REVIEW'
              ? 'رسید شما ثبت شده و در انتظار بررسی مدیریت است.'
              : prepaymentSubmission?.status === 'REJECTED'
                ? 'رسید نیازمند اصلاح است؛ دلیل را ببینید و رسید تازه ارسال کنید.'
                : status === 'CONTRACT_ACCEPTED' && prepayment?.itemStatus !== 'PAID'
                  ? 'پیش‌پرداخت را از بخش پرداخت‌ها واریز و تصویر رسید را ارسال کنید.'
                  : 'وضعیت درخواست را در بخش ثبت‌نام دنبال کنید.',
      warning:
        prepaymentSubmission?.rejectionReason ??
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
      notifications: recentEvents.slice(0, 5),
    };
  });
  return <StudentDashboard students={dashboards} />;
}
