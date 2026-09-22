import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { StudentDashboard, type StudentDashboard as StudentDashboardModel } from './student-dashboard';

function student(
  id: string,
  name: string,
  driver: { id: string; firstName: string; lastName: string; phone: string; direction: 'TO_SCHOOL' | 'FROM_SCHOOL' | 'ROUND_TRIP' },
): StudentDashboardModel {
  return {
    id,
    name,
    schoolAndGrade: 'مدرسه نمونه، پایه اول',
    academicYear: '1405-1406',
    enrollmentCode: 'ENROLLED',
    enrollmentStatus: 'خدمت فعال',
    enrollmentTone: 'info',
    nextAction: 'وضعیت درخواست را دنبال کنید.',
    warning: null,
    contractStatus: 'ACCEPTED',
    paymentSummary: 'پرداخت‌شده',
    nextPayment: 'تسویه‌شده',
    notifications: [],
    driverAssignments: [
      {
        runId: `run-${id}`,
        direction: driver.direction,
        title: `مسیر ${name}`,
        scheduledStartTime: '07:00',
        scheduledArrivalTime: '14:30',
        pickupOrder: 1,
        driverId: driver.id,
        driverFirstName: driver.firstName,
        driverLastName: driver.lastName,
        driverPhoneNumber: driver.phone,
        vehicleType: 'CAR',
        vehicleSystem: 'سمند',
        plateNumber: '12ب34567',
        documents: [
          {
            documentType: 'DRIVER_PHOTO',
            mimeType: 'image/jpeg',
            viewUrl: `https://example.test/${driver.id}.jpg`,
          },
        ],
      },
    ],
  };
}

describe('student driver details', () => {
  it('switches the assigned driver with the selected student', () => {
    render(
      <StudentDashboard
        students={[
          student('student-1', 'آرین احمدی', {
            id: 'driver-1',
            firstName: 'رضا',
            lastName: 'اکبری',
            phone: '09120000001',
            direction: 'TO_SCHOOL',
          }),
          student('student-2', 'سارا احمدی', {
            id: 'driver-2',
            firstName: 'مریم',
            lastName: 'بهشتی',
            phone: '09120000002',
            direction: 'FROM_SCHOOL',
          }),
        ]}
      />,
    );

    expect(screen.getByText('رضا اکبری')).toBeInTheDocument();
    expect(screen.queryByText('ساعت رفت')).toBeNull();
    expect(screen.queryByText('ساعت برگشت')).toBeNull();
    expect(screen.getByAltText('عکس راننده')).toHaveAttribute(
      'src',
      'https://example.test/driver-1.jpg',
    );

    fireEvent.click(screen.getByRole('button', { name: /سارا احمدی/ }));

    expect(screen.getByText('مریم بهشتی')).toBeInTheDocument();
    expect(screen.queryByText('ساعت برگشت')).toBeNull();
    expect(screen.queryByText('ساعت رفت')).toBeNull();
    expect(screen.queryByText('رضا اکبری')).toBeNull();
  });
});
