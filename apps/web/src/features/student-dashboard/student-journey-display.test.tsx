import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  StudentDashboard,
  type StudentDashboard as StudentDashboardModel,
} from './student-dashboard';

describe('student dashboard journey', () => {
  it('shows separately checked prepayment, installments, and activation', () => {
    const student: StudentDashboardModel = {
      id: 'student-1',
      name: 'آرین احمدی',
      schoolAndGrade: 'مدرسه نمونه',
      academicYear: '۱۴۰۵–۱۴۰۶',
      enrollmentCode: 'ENROLLED',
      enrollmentStatus: 'خدمت فعال',
      enrollmentTone: 'info',
      nextAction: 'قسط بعدی را پرداخت کنید.',
      warning: null,
      contractStatus: 'ACCEPTED',
      paymentSummary: '۱٬۰۰۰ ریال پرداخت‌شده',
      nextPayment: '۱٬۰۰۰ ریال',
      notifications: [],
      driverAssignments: [],
      journey: {
        enrollment: [
          { key: 'active', label: 'فعال‌سازی سرویس', detail: 'فعال', state: 'complete' },
        ],
        payments: [
          {
            key: 'prepay',
            label: 'پیش‌پرداخت',
            detail: 'تأیید شده',
            state: 'complete',
            amount: '۱٬۰۰۰ ریال',
          },
          {
            key: 'first',
            label: 'قسط ۱',
            detail: 'رسید در انتظار بررسی',
            state: 'current',
            amount: '۱٬۰۰۰ ریال',
            dueDate: '۱۴۰۵/۰۸/۱۰',
          },
        ],
      },
    };
    render(<StudentDashboard students={[student]} />);
    expect(screen.getByText('پیش‌پرداخت')).toBeInTheDocument();
    expect(screen.getByText('قسط ۱')).toBeInTheDocument();
    expect(screen.getByText('رسید در انتظار بررسی')).toBeInTheDocument();
    expect(screen.getAllByText('فعال‌سازی سرویس')).toHaveLength(2);
  });
});
