import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { AdminFamilyEnrollmentForm } from './admin-family-enrollment-form';

const createAdminFamilyEnrollment = vi.hoisted(() => vi.fn());
const recordPaymentOnBehalf = vi.hoisted(() => vi.fn());
vi.mock('./admin-families-api', async (importOriginal) => {
  const original = await importOriginal<typeof import('./admin-families-api')>();
  return { ...original, createAdminFamilyEnrollment };
});
vi.mock('@/features/admin-payments/admin-payments-api', () => ({ recordPaymentOnBehalf }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

const family = {
  id: 'family-1',
  username: 'احمدی',
  primaryPhone: '09121111111',
  studentCount: 0,
  status: 'فعال',
  parents: [
    {
      id: 'f',
      parentType: 'FATHER',
      firstName: 'رضا',
      lastName: 'احمدی',
      nationalId: '0499370899',
      phoneNumber: '09121111111',
      isPrimaryContact: true,
    },
    {
      id: 'm',
      parentType: 'MOTHER',
      firstName: 'سارا',
      lastName: 'احمدی',
      nationalId: '0067749811',
      phoneNumber: '09122222222',
      isPrimaryContact: false,
    },
  ],
  addresses: [
    {
      id: 'a',
      title: 'منزل',
      province: 'تهران',
      city: 'تهران',
      district: null,
      streetAddress: 'خیابان نمونه',
      postalCode: '1234567890',
      latitude: 35.7,
      longitude: 51.3,
      isActive: true,
    },
  ],
  emergencyContacts: [
    {
      id: 'e',
      firstName: 'مریم',
      lastName: 'احمدی',
      relationship: 'خاله',
      phoneNumber: '09123333333',
      isActive: true,
    },
  ],
  students: [],
};

const schools = [
  {
    id: '00000000-0000-4000-8000-000000000001',
    name: 'مدرسه نمونه',
    educationOptions: [{ level: 'ابتدایی', grades: ['اول'] }],
  },
];

async function fillStudentForm(user: ReturnType<typeof userEvent.setup>) {
  const studentFieldset = screen.getByText('مشخصات دانش‌آموز').closest('fieldset') as HTMLElement;
  await user.type(within(studentFieldset).getByLabelText('نام', { selector: 'input' }), 'علی');
  await user.type(
    within(studentFieldset).getAllByLabelText('نام خانوادگی', { selector: 'input' })[0],
    'احمدی',
  );
  await user.type(
    within(studentFieldset).getByLabelText('کد ملی', { selector: 'input' }),
    '1234567891',
  );
  fireEvent.change(
    within(studentFieldset).getByLabelText('تلفن منزل (۰۲۱)', { selector: 'input' }),
    { target: { value: '02122113333' } },
  );
  const birthDate = screen.getByRole('group', { name: 'تاریخ تولد' });
  await user.type(within(birthDate).getByLabelText('سال'), '1398');
  await user.type(within(birthDate).getByLabelText('ماه'), '01');
  await user.type(within(birthDate).getByLabelText('روز'), '01');
}

describe('AdminFamilyEnrollmentForm', () => {
  it('submits the complete guided payload and leaves contract/payment action to the parent', async () => {
    createAdminFamilyEnrollment.mockResolvedValue({
      data: { status: 'CONTRACT_READY', parentActionRequired: true },
    });
    const user = userEvent.setup();
    render(<AdminFamilyEnrollmentForm family={family} schools={schools} />);

    await fillStudentForm(user);
    await user.click(screen.getByRole('button', { name: 'ایجاد ثبت‌نام و ارسال برای اقدام والد' }));

    expect(createAdminFamilyEnrollment).toHaveBeenCalledWith(
      'family-1',
      expect.objectContaining({
        student: expect.objectContaining({ firstName: 'علی', nationalId: '1234567891' }),
        homePhone: '02122113333',
        guardian: expect.objectContaining({
          firstName: 'رضا',
          relationshipType: 'FATHER',
        }),
        father: expect.objectContaining({ phoneNumber: '09121111111' }),
        emergencyContact: expect.objectContaining({ relationship: 'خاله' }),
        address: expect.objectContaining({ postalCode: '1234567890', latitude: 35.7 }),
        school: {
          schoolId: '00000000-0000-4000-8000-000000000001',
          educationLevel: 'ابتدایی',
          grade: 'اول',
        },
      }),
      undefined,
    );
    expect(
      await screen.findByText(/قرارداد و پیش‌پرداخت اکنون برای بررسی و اقدام والد/),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /پذیرش قرارداد|پرداخت/ })).not.toBeInTheDocument();
  }, 30_000);

  it('signs the contract and records prepayment only with a receipt image', async () => {
    createAdminFamilyEnrollment.mockResolvedValue({
      data: {
        status: 'CONTRACT_ACCEPTED',
        parentActionRequired: false,
        scheduleItemId: 'schedule-1',
      },
    });
    recordPaymentOnBehalf.mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<AdminFamilyEnrollmentForm family={family} schools={schools} />);

    await fillStudentForm(user);
    await user.click(screen.getByRole('checkbox', { name: /پذیرش قرارداد به نمایندگی از والد/ }));
    await user.click(screen.getByRole('checkbox', { name: /ثبت پیش‌پرداخت نقدی/ }));
    expect(screen.getByText('هشدار پیش‌پرداخت نقدی')).toBeInTheDocument();
    await user.type(screen.getByLabelText('شماره رسید / مرجع پرداخت'), 'receipt-001');
    const paidAt = screen.getByRole('group', { name: 'تاریخ شمسی' });
    await user.type(within(paidAt).getByLabelText('سال'), '1405');
    await user.type(within(paidAt).getByLabelText('ماه'), '05');
    await user.type(within(paidAt).getByLabelText('روز'), '19');
    const receipt = new File(['receipt'], 'receipt.png', { type: 'image/png' });
    await user.upload(screen.getByLabelText(/تصویر رسید پرداخت/), receipt);
    await user.click(
      screen.getByRole('button', { name: 'ایجاد ثبت‌نام و تکمیل به نمایندگی والد' }),
    );

    expect(createAdminFamilyEnrollment).toHaveBeenCalledWith(
      'family-1',
      expect.objectContaining({ student: expect.objectContaining({ firstName: 'علی' }) }),
      {
        signContractOnBehalf: { reason: undefined, source: 'admin_console' },
      },
    );
    expect(recordPaymentOnBehalf).toHaveBeenCalledWith(
      'schedule-1',
      expect.objectContaining({ referenceNumber: 'receipt-001' }),
      receipt,
      expect.any(String),
    );
    expect(
      await screen.findByText(/قرارداد به نمایندگی از والد پذیرفته شد و پیش‌پرداخت نقدی ثبت گردید/),
    ).toBeInTheDocument();
  }, 30_000);

  it('blocks a cash prepayment without a receipt reference', async () => {
    createAdminFamilyEnrollment.mockResolvedValue({ data: { status: 'ENROLLED' } });
    const user = userEvent.setup();
    render(<AdminFamilyEnrollmentForm family={family} schools={schools} />);

    await fillStudentForm(user);
    await user.click(screen.getByRole('checkbox', { name: /پذیرش قرارداد به نمایندگی از والد/ }));
    await user.click(screen.getByRole('checkbox', { name: /ثبت پیش‌پرداخت نقدی/ }));
    await user.click(
      screen.getByRole('button', { name: 'ایجاد ثبت‌نام و تکمیل به نمایندگی والد' }),
    );

    expect(createAdminFamilyEnrollment).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('تصویر رسید');
  }, 30_000);
});
