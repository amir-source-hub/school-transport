import { afterEach, describe, expect, it, vi } from 'vitest';

import { getAdminStudentDetail, updateAdminStudent } from './admin-students-api';

function mockFetch(data: unknown) {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(
    new Response(JSON.stringify({ success: true, data }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }),
  );
}

describe('admin student detail API', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  const detail = {
    id: 'student-1',
    firstName: 'علی',
    lastName: 'احمدی',
    nationalId: '0499370899',
    schoolName: 'مدرسه نمونه',
    grade: 'سوم',
    className: 'دبستان',
    familyName: 'احمدی',
    userId: 'account-1',
    schoolId: 'school-1',
    isActive: true,
    birthDate: '2012-04-03',
    gender: 'MALE',
    updatedAt: '2026-08-08T10:00:00.000Z',
    schoolType: 'PRIVATE',
    parents: [
      {
        id: 'parent-1',
        parentType: 'FATHER',
        firstName: 'علی',
        lastName: 'احمدی',
        nationalId: '0499370899',
        phoneNumber: '09121112233',
        isPrimaryContact: true,
      },
    ],
    addresses: [
      {
        id: 'address-1',
        title: 'خانه',
        province: 'تهران',
        city: 'تهران',
        district: null,
        streetAddress: 'خیابان آزادی',
        postalCode: '1234567890',
        latitude: 35.7,
        longitude: 51.4,
        isActive: true,
      },
    ],
    emergencyContacts: [],
    enrollmentSummary: {
      registrationId: 'registration-1',
      registrationStatus: 'CONTRACT_READY',
      academicYear: '1404-1405',
      serviceType: 'BUS',
      requestedStartDate: null,
      submittedAt: null,
      reviewedAt: null,
      createdAt: '2026-08-01T00:00:00.000Z',
      contract: {
        id: 'contract-1',
        contractNumber: 'C-1',
        contractStatus: 'DRAFT',
        versionNumber: 1,
        generatedAt: null,
        acceptedAt: null,
      },
      price: {
        id: 'price-1',
        totalAmount: 5_000_000,
        prepaymentAmount: 1_000_000,
        installmentCount: 4,
        priceStatus: 'ACCEPTED',
      },
      plan: {
        id: 'plan-1',
        planType: 'ADMIN_CONFIGURED',
        totalAmount: 5_000_000,
        prepaymentAmount: 1_000_000,
        remainingInstallmentAmount: 4_000_000,
        installmentCount: 4,
        planStatus: 'ACTIVE',
        paidInstallmentCount: 1,
        scheduleItems: [
          { itemType: 'PREPAYMENT', sequenceNumber: 0, amount: 1_000_000, dueDate: null, itemStatus: 'PAID', paidAt: '2026-08-02T00:00:00.000Z' },
        ],
      },
    },
  };

  it('parses the complete admin student detail response', async () => {
    mockFetch(detail);

    const result = await getAdminStudentDetail('student-1');

    expect(result.firstName).toBe('علی');
    expect(result.schoolType).toBe('PRIVATE');
    expect(result.parents).toHaveLength(1);
    expect(result.enrollmentSummary?.contract?.contractNumber).toBe('C-1');
    expect(result.enrollmentSummary?.plan?.paidInstallmentCount).toBe(1);
  });

  it('surfaces backend failures', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('network unavailable'));
    await expect(getAdminStudentDetail('student-1')).rejects.toThrow();
  });

  it('returns the updated timestamp for optimistic concurrency', async () => {
    mockFetch({ id: 'student-1', updatedAt: '2026-08-08T11:00:00.000Z' });

    const updated = await updateAdminStudent('student-1', {
      firstName: 'سارا',
      expectedUpdatedAt: '2026-08-08T10:00:00.000Z',
    });

    expect(updated).toEqual({ id: 'student-1', updatedAt: '2026-08-08T11:00:00.000Z' });
  });
});
