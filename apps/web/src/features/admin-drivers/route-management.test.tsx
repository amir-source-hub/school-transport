import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import { RouteManagement } from './route-management';
import { ApiClientError } from '@/lib/api-client';

const createRoute = vi.fn(async (_body: unknown) => ({}));
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
