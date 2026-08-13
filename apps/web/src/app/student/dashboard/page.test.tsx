import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import StudentDashboardPage from './page';
import { getStudents } from '@/features/students/students-api';
import { getEnrollments } from '@/features/enrollment/enrollments-api';
import { getContracts } from '@/features/finance/contracts-api';
import { getOfflineSubmissions, getPayments } from '@/features/finance/payments-api';
import { getNotifications } from '@/features/notifications/notifications-api';

vi.mock('@/features/students/students-api', () => ({ getStudents: vi.fn() }));
vi.mock('@/features/enrollment/enrollments-api', () => ({ getEnrollments: vi.fn() }));
vi.mock('@/features/finance/contracts-api', () => ({ getContracts: vi.fn() }));
vi.mock('@/features/finance/payments-api', () => ({
  getPayments: vi.fn(),
  getOfflineSubmissions: vi.fn(),
}));
vi.mock('@/features/notifications/notifications-api', () => ({ getNotifications: vi.fn() }));
vi.mock('@/features/student-dashboard/student-dashboard', () => ({
  StudentDashboard: ({ students }: { students: Array<Record<string, unknown>> }) => (
    <div>
      <p>{String(students[0]?.enrollmentStatus)}</p>
      <p>{String(students[0]?.nextAction)}</p>
      <p>{String(students[0]?.warning ?? '')}</p>
    </div>
  ),
}));

describe('family dashboard prepayment lifecycle', () => {
  beforeEach(() => {
    vi.mocked(getStudents).mockResolvedValue([
      {
        id: 'student-1',
        firstName: 'نیلی',
        lastName: 'افشار',
        schoolName: 'مدرسه نمونه',
        grade: 'اول',
      } as never,
    ]);
    vi.mocked(getEnrollments).mockResolvedValue([
      {
        id: 'registration-1',
        studentId: 'student-1',
        academicYear: '1405-1406',
        registrationStatus: 'CONTRACT_ACCEPTED',
        rejectionReason: null,
      } as never,
    ]);
    vi.mocked(getContracts).mockResolvedValue([
      { registrationId: 'registration-1', contractStatus: 'ACCEPTED' } as never,
    ]);
    vi.mocked(getPayments).mockResolvedValue([
      {
        studentId: 'student-1',
        plan: { totalAmount: 49_978_000 },
        items: [
          {
            id: 'prepayment-1',
            itemType: 'PREPAYMENT',
            itemStatus: 'PENDING',
            amount: 49_978_000,
            paidAmount: 0,
            dueDate: null,
          },
        ],
        transactions: [],
      } as never,
    ]);
    vi.mocked(getNotifications).mockResolvedValue({ items: [] } as never);
  });

  it('shows a submitted receipt as waiting for admin review', async () => {
    vi.mocked(getOfflineSubmissions).mockResolvedValue([
      {
        id: 'submission-1',
        paymentScheduleItemId: 'prepayment-1',
        status: 'PENDING_REVIEW',
        rejectionReason: null,
        submittedAt: new Date(),
      },
    ]);

    render(await StudentDashboardPage());
    expect(screen.getByText('رسید پیش‌پرداخت در انتظار بررسی')).toBeInTheDocument();
    expect(screen.getByText('رسید شما ثبت شده و در انتظار بررسی مدیریت است.')).toBeInTheDocument();
  });

  it('shows the rejection reason and directs the family to resubmit', async () => {
    vi.mocked(getOfflineSubmissions).mockResolvedValue([
      {
        id: 'submission-1',
        paymentScheduleItemId: 'prepayment-1',
        status: 'REJECTED',
        rejectionReason: 'تصویر رسید خوانا نیست.',
        submittedAt: new Date(),
      },
    ]);

    render(await StudentDashboardPage());
    expect(screen.getByText('رسید پیش‌پرداخت نیازمند اصلاح')).toBeInTheDocument();
    expect(screen.getByText(/رسید تازه ارسال کنید/)).toBeInTheDocument();
    expect(screen.getByText('تصویر رسید خوانا نیست.')).toBeInTheDocument();
  });
});
