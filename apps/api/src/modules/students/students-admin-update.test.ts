import { describe, expect, it, vi } from 'vitest';
import type { DatabaseService } from '../../database/database.service';
import type { InAppNotificationService } from '../../infrastructure/notifications/in-app-notification.service';
import { StudentsService } from './students.service';

function buildChain(rows: unknown[]) {
  const thenable = {
    from: vi.fn(),
    innerJoin: vi.fn(),
    where: vi.fn(),
    orderBy: vi.fn(),
    for: vi.fn(),
    limit: vi.fn(),
    then: (onFulfilled: (value: unknown) => unknown) =>
      Promise.resolve(rows).then(onFulfilled),
  };
  thenable.from.mockReturnValue(thenable);
  thenable.innerJoin.mockReturnValue(thenable);
  thenable.where.mockReturnValue(thenable);
  thenable.orderBy.mockReturnValue(thenable);
  thenable.for.mockReturnValue(thenable);
  thenable.limit.mockReturnValue(thenable);
  return thenable;
}

function updateReturningChain(rows: unknown[]) {
  const chain = {
    set: vi.fn(),
    where: vi.fn(),
    returning: vi.fn(() => Promise.resolve(rows)),
  };
  chain.set.mockReturnValue(chain);
  chain.where.mockReturnValue(chain);
  return chain;
}

function makeService(selectResults: unknown[][]) {
  const select = vi.fn(() => buildChain(selectResults.shift() ?? []));
  const transaction = vi.fn(async (callback: (txn: unknown) => Promise<unknown>) =>
    callback({ update: vi.fn(() => updateReturningChain([{ id: 'student-1' }])) }),
  );
  const notifications = { enqueueInTransaction: vi.fn() };
  const audit = { recordInTransaction: vi.fn() };
  const service = new StudentsService(
    { db: { transaction, select } } as unknown as DatabaseService,
    notifications as unknown as InAppNotificationService,
    audit as never,
  );
  return { service, audit, select, transaction };
}

const studentColumns = {
  userId: 'account-1',
  schoolId: 'school-1',
  firstName: 'علی',
  lastName: 'احمدی',
  nationalId: '0499370899',
  birthDate: '2012-04-03',
  gender: 'MALE',
  grade: 'سوم',
  className: 'دبستان',
  studentCode: 'ST-1',
  isActive: true,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
};

const currentStudent = {
  id: 'student-1',
  ...studentColumns,
  updatedAt: new Date('2026-08-08T10:00:00.000Z'),
  schoolName: 'مدرسه نمونه',
};

describe('updateByAdmin', () => {
  it('updates editable fields and audits masked before/after values', async () => {
    const { service, audit, transaction } = makeService([[currentStudent], [currentStudent]]);

    await service.updateByAdmin(
      'student-1',
      {
        firstName: 'سارا',
        expectedUpdatedAt: currentStudent.updatedAt.toISOString(),
      },
      { adminId: 'admin-1', ipAddress: '127.0.0.1' },
    );

    expect(transaction).toHaveBeenCalledTimes(1);
    expect(audit.recordInTransaction).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        actorType: 'ADMIN',
        actorId: 'admin-1',
        action: 'STUDENT_UPDATED_BY_ADMIN',
        entityType: 'STUDENT',
        entityId: 'student-1',
        previousValues: { firstName: 'علی' },
        newValues: { firstName: 'سارا' },
        ipAddress: '127.0.0.1',
      }),
    );
  });

  it('rejects the update when the student changed elsewhere (optimistic concurrency)', async () => {
    const { service, transaction, audit } = makeService([[currentStudent]]);

    await expect(
      service.updateByAdmin(
        'student-1',
        {
          firstName: 'سارا',
          expectedUpdatedAt: '2026-08-08T09:00:00.000Z',
        },
        { adminId: 'admin-1' },
      ),
    ).rejects.toMatchObject({ status: 409, code: 'STUDENT_CONCURRENT_MODIFIED' });
    expect(transaction).not.toHaveBeenCalled();
    expect(audit.recordInTransaction).not.toHaveBeenCalled();
  });

  it('rejects a national id already used by another student', async () => {
    const { service, transaction, audit } = makeService([
      [currentStudent],
      [{ id: 'student-2' }],
    ]);

    await expect(
      service.updateByAdmin(
        'student-1',
        { nationalId: '1122334455' },
        { adminId: 'admin-1' },
      ),
    ).rejects.toMatchObject({ status: 409, code: 'DUPLICATE_NATIONAL_ID' });
    expect(transaction).not.toHaveBeenCalled();
    expect(audit.recordInTransaction).not.toHaveBeenCalled();
  });

  it('rejects an education level or grade the school does not offer', async () => {
    const school = {
      id: 'school-1',
      isActive: true,
      educationOptions: [{ level: 'دبستان', grades: ['اول', 'دوم'] }],
    };
    const { service, transaction, audit } = makeService([[currentStudent], [school]]);

    await expect(
      service.updateByAdmin('student-1', { educationLevel: 'متوسطه' }, { adminId: 'admin-1' }),
    ).rejects.toMatchObject({ status: 409, code: 'INVALID_SCHOOL_PROGRAM' });
    expect(transaction).not.toHaveBeenCalled();
    expect(audit.recordInTransaction).not.toHaveBeenCalled();
  });

  it('rejects an inactive school', async () => {
    const school = {
      id: 'school-1',
      isActive: false,
      educationOptions: [{ level: 'دبستان', grades: ['سوم'] }],
    };
    const { service } = makeService([[currentStudent], [school]]);

    await expect(
      service.updateByAdmin('student-1', { educationLevel: 'دبستان' }, { adminId: 'admin-1' }),
    ).rejects.toMatchObject({ status: 409, code: 'INVALID_SCHOOL' });
  });

  it('maps educationLevel to className and validates the full program', async () => {
    const school = {
      id: 'school-1',
      isActive: true,
      educationOptions: [
        { level: 'دبستان', grades: ['سوم', 'چهارم'] },
        { level: 'متوسطه', grades: ['هفتم'] },
      ],
    };
    const { service, transaction } = makeService([[currentStudent], [school], [currentStudent]]);

    await service.updateByAdmin(
      'student-1',
      { educationLevel: 'متوسطه', grade: 'هفتم' },
      { adminId: 'admin-1' },
    );

    expect(transaction).toHaveBeenCalledTimes(1);
  });

  it('throws when the student does not exist', async () => {
    const { service, transaction, audit } = makeService([[]]);

    await expect(
      service.updateByAdmin('missing', { firstName: 'سارا' }, { adminId: 'admin-1' }),
    ).rejects.toMatchObject({ status: 404 });
    expect(transaction).not.toHaveBeenCalled();
    expect(audit.recordInTransaction).not.toHaveBeenCalled();
  });
});

describe('getForAdmin', () => {
  it('returns the complete student detail with family and enrollment summary', async () => {
    const schoolRow = { schoolType: 'PRIVATE' };
    const parent = {
      id: 'parent-1',
      parentType: 'FATHER',
      firstName: 'علی',
      lastName: 'احمدی',
      nationalId: '0499370899',
      phoneNumber: '09121112233',
      isPrimaryContact: true,
    };
    const address = {
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
    };
    const emergency = {
      id: 'emergency-1',
      firstName: 'مریم',
      lastName: 'احمدی',
      relationship: 'مادر',
      phoneNumber: '09123334455',
      isActive: true,
    };
    const registration = {
      id: 'registration-1',
      studentId: 'student-1',
      academicYear: '1404-1405',
      serviceType: 'BUS',
      requestedStartDate: null,
      registrationStatus: 'CONTRACT_READY',
      submittedAt: null,
      reviewedAt: null,
      createdAt: new Date('2026-08-01T00:00:00.000Z'),
    };
    const contract = {
      id: 'contract-1',
      contractNumber: 'C-1',
      contractStatus: 'DRAFT',
      versionNumber: 1,
      generatedAt: null,
      acceptedAt: null,
    };
    const price = {
      id: 'price-1',
      totalAmount: 5_000_000,
      prepaymentAmount: 1_000_000,
      installmentCount: 4,
      priceStatus: 'ACCEPTED',
    };
    const plan = {
      id: 'plan-1',
      planType: 'ADMIN_CONFIGURED',
      totalAmount: 5_000_000,
      prepaymentAmount: 1_000_000,
      remainingInstallmentAmount: 4_000_000,
      installmentCount: 4,
      planStatus: 'ACTIVE',
    };
    const schedule = [
      {
        id: 'item-1',
        itemType: 'PREPAYMENT',
        sequenceNumber: 0,
        amount: 1_000_000,
        itemStatus: 'PAID',
        paidAt: new Date('2026-08-02T00:00:00.000Z'),
        dueDate: null,
      },
      {
        id: 'item-2',
        itemType: 'INSTALLMENT',
        sequenceNumber: 1,
        amount: 1_000_000,
        itemStatus: 'PAID',
        paidAt: null,
        dueDate: null,
      },
      {
        id: 'item-3',
        itemType: 'INSTALLMENT',
        sequenceNumber: 2,
        amount: 1_000_000,
        itemStatus: 'PENDING',
        paidAt: null,
        dueDate: null,
      },
    ];
    const { service } = makeService([
      [currentStudent],
      [schoolRow],
      [parent],
      [address],
      [emergency],
      [registration],
      [contract],
      [price],
      [plan],
      schedule,
    ]);

    const detail = await service.getForAdmin('student-1');

    expect(detail.schoolType).toBe('PRIVATE');
    expect(detail.parents).toHaveLength(1);
    expect(detail.parents[0]).toMatchObject({
      id: 'parent-1',
      parentType: 'FATHER',
      firstName: 'علی',
      isPrimaryContact: true,
    });
    expect(detail.addresses[0]).toMatchObject({ id: 'address-1', latitude: 35.7 });
    expect(detail.emergencyContacts[0]).toMatchObject({ id: 'emergency-1' });
    expect(detail.enrollmentSummary).toMatchObject({
      registrationId: 'registration-1',
      registrationStatus: 'CONTRACT_READY',
      contract: { contractNumber: 'C-1', contractStatus: 'DRAFT' },
      price: { totalAmount: 5_000_000 },
      plan: { planType: 'ADMIN_CONFIGURED', paidInstallmentCount: 1 },
    });
  });

  it('returns a null enrollment summary when the student has no registration', async () => {
    const { service } = makeService([[currentStudent], [{ schoolType: 'PUBLIC' }], [], [], [], []]);

    const detail = await service.getForAdmin('student-1');

    expect(detail.enrollmentSummary).toBeNull();
    expect(detail.parents).toEqual([]);
  });
});
