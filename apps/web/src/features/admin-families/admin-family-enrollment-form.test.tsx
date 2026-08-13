import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AdminFamilyEnrollmentForm } from './admin-family-enrollment-form';

const createEnrollmentForm = vi.hoisted(() => vi.fn(() => <div>فرم مشترک ثبت‌نام</div>));
vi.mock('@/features/enrollment/enrollment-actions', () => ({
  CreateEnrollmentForm: createEnrollmentForm,
}));

const family = {
  id: 'family-1',
  username: 'احمدی',
  primaryPhone: '09121111111',
  studentCount: 0,
  status: 'فعال',
  parents: [
    {
      id: 'father-1',
      parentType: 'FATHER',
      firstName: 'رضا',
      lastName: 'احمدی',
      nationalId: '0499370899',
      phoneNumber: '09121111111',
      isPrimaryContact: true,
    },
    {
      id: 'mother-1',
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
      id: 'address-1',
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
  emergencyContacts: [],
  students: [],
};

const schools = [
  {
    id: 'school-1',
    name: 'مدرسه نمونه',
    city: 'تهران',
    educationOptions: [{ level: 'ابتدایی', grades: ['اول'] }],
  },
];

describe('AdminFamilyEnrollmentForm', () => {
  it('uses the exact shared parent enrollment form with family-scoped defaults', () => {
    render(<AdminFamilyEnrollmentForm family={family} schools={schools} />);

    expect(screen.getByText('فرم مشترک ثبت‌نام')).toBeInTheDocument();
    expect(createEnrollmentForm).toHaveBeenCalledWith(
      expect.objectContaining({
        adminFamilyId: 'family-1',
        schools,
        guardianPhone: '09121111111',
        existingStudents: [],
        savedParents: expect.objectContaining({
          father: expect.objectContaining({ firstName: 'رضا' }),
          mother: expect.objectContaining({ firstName: 'سارا' }),
        }),
        defaults: expect.objectContaining({
          guardian: expect.objectContaining({ relationshipType: 'FATHER' }),
          address: expect.objectContaining({ streetAddress: 'خیابان نمونه' }),
        }),
      }),
      undefined,
    );
  });
});
