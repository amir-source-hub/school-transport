import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { AdminFamilyEnrollmentForm } from './admin-family-enrollment-form';

const createAdminFamilyEnrollment = vi.hoisted(() => vi.fn());
vi.mock('./admin-families-api', async (importOriginal) => {
  const original = await importOriginal<typeof import('./admin-families-api')>();
  return { ...original, createAdminFamilyEnrollment };
});
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

describe('AdminFamilyEnrollmentForm', () => {
  it('submits the complete guided payload and leaves contract/payment action to the parent', async () => {
    createAdminFamilyEnrollment.mockResolvedValue({ data: { parentActionRequired: true } });
    const user = userEvent.setup();
    render(
      <AdminFamilyEnrollmentForm
        family={{
          id: 'family-1', username: 'احمدی', primaryPhone: '09121111111', studentCount: 0,
          status: 'فعال', parents: [
            { id: 'f', parentType: 'FATHER', firstName: 'رضا', lastName: 'احمدی', nationalId: '0499370899', phoneNumber: '09121111111', isPrimaryContact: true },
            { id: 'm', parentType: 'MOTHER', firstName: 'سارا', lastName: 'احمدی', nationalId: '0067749829', phoneNumber: '09122222222', isPrimaryContact: false },
          ],
          addresses: [{ id: 'a', title: 'منزل', province: 'تهران', city: 'تهران', district: null, streetAddress: 'خیابان نمونه', postalCode: '1234567890', latitude: 35.7, longitude: 51.3, isActive: true }],
          emergencyContacts: [{ id: 'e', firstName: 'مریم', lastName: 'احمدی', relationship: 'خاله', phoneNumber: '09123333333', isActive: true }],
          students: [],
        }}
        schools={[{ id: 'school-1', name: 'مدرسه نمونه', educationOptions: [{ level: 'ابتدایی', grades: ['اول'] }] }]}
      />,
    );

    const studentFieldset = screen.getByText('مشخصات دانش‌آموز').closest('fieldset') as HTMLElement;
    await user.type(within(studentFieldset).getByLabelText('نام', { selector: 'input' }), 'علی');
    await user.type(
      within(studentFieldset).getAllByLabelText('نام خانوادگی', { selector: 'input' })[0],
      'احمدی',
    );
    await user.type(within(studentFieldset).getByLabelText('کد ملی', { selector: 'input' }), '0013540399');
    await user.type(screen.getByPlaceholderText('۱۴۰۵/۰۱/۰۱'), '13980101');
    await user.click(screen.getByRole('button', { name: 'ایجاد ثبت‌نام و ارسال برای اقدام والد' }));

    expect(createAdminFamilyEnrollment).toHaveBeenCalledWith(
      'family-1',
      expect.objectContaining({
        student: expect.objectContaining({ firstName: 'علی', nationalId: '0013540399' }),
        guardian: expect.objectContaining({
          firstName: 'رضا',
          relationshipType: 'FATHER',
        }),
        father: expect.objectContaining({ phoneNumber: '09121111111' }),
        emergencyContact: expect.objectContaining({ relationship: 'خاله' }),
        address: expect.objectContaining({ postalCode: '1234567890', latitude: 35.7 }),
        school: { schoolId: 'school-1', educationLevel: 'ابتدایی', grade: 'اول' },
      }),
    );
    expect(await screen.findByText(/قرارداد و پیش‌پرداخت اکنون برای بررسی و اقدام والد/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /پذیرش قرارداد|پرداخت/ })).not.toBeInTheDocument();
  });
});
