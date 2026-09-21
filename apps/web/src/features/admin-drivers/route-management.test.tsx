import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import { RouteManagement } from './route-management';
import { ApiClientError } from '@/lib/api-client';

const createRoute = vi.fn(async (...args: unknown[]) => {
  void args;
  return {};
});
const refresh = vi.fn();

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }));
vi.mock('./admin-drivers-api', () => ({
  createAdminTransportRoute: (body: unknown) => createRoute(body),
  addStudentToAdminRoute: vi.fn(),
  archiveAdminRoute: vi.fn(),
  removeStudentFromAdminRoute: vi.fn(),
  updateAdminTransportRoute: vi.fn(),
}));

beforeEach(() => {
  createRoute.mockClear();
  refresh.mockClear();
});

it('submits grouped tomans as rials and the selected Jalali contract date', async () => {
  render(
    <RouteManagement
      routes={[]}
      students={[]}
      drivers={
        [
          { id: 'driver', firstName: 'علی', lastName: 'احمدی', status: 'ACTIVE', capacity: 4 },
        ] as never
      }
      schools={
        [
          {
            id: 'school',
            name: 'مدرسه نمونه',
            isActive: true,
            schoolType: 'NORMAL',
            openingTime: '07:15',
            closingTime: '14:30',
            closingTimes: [],
          },
        ] as never
      }
    />,
  );
  fireEvent.change(screen.getByRole('textbox', { name: 'عنوان مسیر' }), {
    target: { value: 'مسیر نمونه' },
  });
  fireEvent.change(screen.getByRole('combobox', { name: 'راننده' }), {
    target: { value: 'driver' },
  });
  fireEvent.change(screen.getByRole('combobox', { name: 'مدرسه مبنا' }), {
    target: { value: 'school' },
  });
  fireEvent.change(screen.getByRole('combobox', { name: 'جهت' }), {
    target: { value: 'TO_SCHOOL' },
  });
  fireEvent.change(screen.getByRole('textbox', { name: 'مبلغ ماهانه قرارداد به تومان' }), {
    target: { value: '۹۰۰۰۰۰۰' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'ایجاد مسیر' }));
  await waitFor(() =>
    expect(createRoute).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'مسیر نمونه',
        contractPriceRials: 90_000_000,
        contractDate: '1405/07/01',
      }),
    ),
  );
});

it('submits a round-trip route as one route and keeps capacity advisory', async () => {
  render(
    <RouteManagement
      routes={[]}
      students={[]}
      drivers={
        [{ id: 'driver', firstName: 'علی', lastName: 'احمدی', status: 'ACTIVE', capacity: 4 }] as never
      }
      schools={
        [
          {
            id: 'school',
            name: 'مدرسه نمونه',
            isActive: true,
            schoolType: 'NORMAL',
            openingTime: '07:15',
            closingTime: '14:30',
            closingTimes: [],
          },
        ] as never
      }
    />,
  );
  fireEvent.change(screen.getByRole('textbox', { name: 'عنوان مسیر' }), {
    target: { value: 'مسیر رفت و برگشت' },
  });
  fireEvent.change(screen.getByRole('combobox', { name: 'راننده' }), {
    target: { value: 'driver' },
  });
  fireEvent.change(screen.getByRole('combobox', { name: 'مدرسه مبنا' }), {
    target: { value: 'school' },
  });
  fireEvent.change(screen.getByRole('combobox', { name: 'جهت' }), {
    target: { value: 'ROUND_TRIP' },
  });
  fireEvent.change(screen.getByRole('textbox', { name: 'مبلغ ماهانه قرارداد به تومان' }), {
    target: { value: '111111111111' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'ایجاد مسیر' }));
  await waitFor(() =>
    expect(createRoute).toHaveBeenCalledWith(
      expect.objectContaining({
        direction: 'ROUND_TRIP',
        contractPriceRials: 1_111_111_111_110,
      }),
    ),
  );
  expect(screen.getByText(/ظرفیت خودرو فقط هشدار است/)).toBeInTheDocument();
});

it('shows only the relevant school clocks and submits the selected closing time', async () => {
  render(
    <RouteManagement
      routes={[]}
      students={[]}
      drivers={
        [
          { id: 'z-driver', firstName: 'رضا', lastName: 'زارعی', status: 'ACTIVE', capacity: 4 },
          { id: 'a-driver', firstName: 'علی', lastName: 'احمدی', status: 'ACTIVE', capacity: 4 },
        ] as never
      }
      schools={
        [
          {
            id: 'school',
            name: 'مدرسه چندنوبته',
            isActive: true,
            schoolType: 'SPECIAL',
            openingTime: '07:15',
            openingTimes: ['07:15', '08:00'],
            closingTime: '12:30',
            closingTimes: ['12:30', '14:30'],
          },
        ] as never
      }
    />,
  );
  fireEvent.change(screen.getByRole('textbox', { name: 'عنوان مسیر' }), {
    target: { value: 'مسیر برگشت دوم' },
  });
  const driverOptions = screen
    .getByRole('combobox', { name: 'راننده' })
    .querySelectorAll('option');
  expect(driverOptions[1]).toHaveTextContent('علی احمدی');
  expect(driverOptions[2]).toHaveTextContent('رضا زارعی');
  fireEvent.change(screen.getByRole('combobox', { name: 'راننده' }), {
    target: { value: 'a-driver' },
  });
  fireEvent.change(screen.getByRole('combobox', { name: 'مدرسه مبنا' }), {
    target: { value: 'school' },
  });
  fireEvent.change(screen.getByRole('combobox', { name: 'جهت' }), {
    target: { value: 'FROM_SCHOOL' },
  });
  expect(screen.queryByRole('combobox', { name: 'ساعت رفت (شروع مدرسه)' })).toBeNull();
  fireEvent.change(screen.getByRole('combobox', { name: 'ساعت برگشت (پایان مدرسه)' }), {
    target: { value: '14:30' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'ایجاد مسیر' }));

  await waitFor(() =>
    expect(createRoute).toHaveBeenCalledWith(
      expect.objectContaining({
        direction: 'FROM_SCHOOL',
        scheduledStartTime: '14:30',
        scheduledArrivalTime: '14:30',
      }),
    ),
  );
});

it('explains a route rejection and shows its request ID for support', async () => {
  createRoute.mockRejectedValueOnce(
    new ApiClientError(
      409,
      'DRIVER_HAS_NO_ACTIVE_VEHICLE',
      'راننده خودروی فعال ندارد.',
      'request-123',
    ),
  );
  render(
    <RouteManagement
      routes={[]}
      students={[]}
      drivers={
        [
          { id: 'driver', firstName: 'علی', lastName: 'احمدی', status: 'ACTIVE', capacity: 4 },
        ] as never
      }
      schools={
        [
          {
            id: 'school',
            name: 'مدرسه نمونه',
            isActive: true,
            schoolType: 'SPECIAL',
            openingTime: '07:15',
            closingTime: '14:30',
            closingTimes: [],
          },
        ] as never
      }
    />,
  );
  fireEvent.change(screen.getByRole('textbox', { name: 'عنوان مسیر' }), {
    target: { value: 'مسیر نمونه' },
  });
  fireEvent.change(screen.getByRole('combobox', { name: 'راننده' }), {
    target: { value: 'driver' },
  });
  fireEvent.change(screen.getByRole('combobox', { name: 'مدرسه مبنا' }), {
    target: { value: 'school' },
  });
  fireEvent.change(screen.getByRole('combobox', { name: 'جهت' }), {
    target: { value: 'TO_SCHOOL' },
  });
  const form = screen.getByRole('button', { name: 'ایجاد مسیر' }).closest('form')!;
  expect(
    Array.from(form.querySelectorAll(':invalid')).map((field) => field.getAttribute('name')),
  ).toEqual([]);
  fireEvent.submit(form);
  expect(await screen.findByRole('alert')).toHaveTextContent('راننده خودروی فعال ندارد.');
  expect(screen.getByRole('alert')).toHaveTextContent('request-123');
});

it('shows each assigned student address beside the route times', () => {
  render(
    <RouteManagement
      routes={
        [
          {
            id: 'route',
            driverId: 'driver',
            title: 'مسیر نمونه',
            direction: 'TO_SCHOOL',
            academicYear: '1405-1406',
            scheduledStartTime: '07:00',
            scheduledArrivalTime: '07:00',
            activeWeekdays: [0, 1],
            areaDescription: null,
            contractPriceRials: null,
            contractDate: null,
            school: { id: 'school', name: 'مدرسه نمونه' },
            driver: { id: 'driver', firstName: 'رضا', lastName: 'محمدی', capacity: 4 },
            students: [
              {
                id: 'student',
                firstName: 'سارا',
                lastName: 'احمدی',
                address: 'خیابان آزادی، کوچه امید',
                pickupOrder: 1,
                scheduledStopTime: '07:00',
                seatCount: 1,
                companion: null,
              },
            ],
          },
        ] as never
      }
      students={[]}
      drivers={[]}
      schools={[]}
    />,
  );

  fireEvent.change(screen.getByRole('combobox', { name: 'مسیر' }), {
    target: { value: 'route' },
  });
  expect(screen.getByRole('option', { name: 'مسیر نمونه · مدرسه نمونه · رضا محمدی' })).toBeInTheDocument();
  expect(screen.getByText('آدرس: خیابان آزادی، کوچه امید')).toBeInTheDocument();
});
