import { describe, expect, it, vi } from 'vitest';
import type { DatabaseService } from '../../database/database.service';
import type { AuditPort } from '../../common/audit.port';
import type { InAppNotificationService } from '../../infrastructure/notifications/in-app-notification.service';
import { RegistrationsService } from './registrations.service';
import type { GuidedEnrollmentData } from './guided-enrollment';
import type { AdminEnrollmentActions } from './admin-guided-enrollment';
import { users } from '../../database/schemas';

function terminal(rows: unknown[]) {
  return {
    limit: vi.fn(async () => rows),
    for: vi.fn(async () => rows),
    then: (resolve: (value: unknown[]) => unknown, reject: (reason: unknown) => unknown) =>
      Promise.resolve(rows).then(resolve, reject),
  };
}

function buildMockDb(selectResults: unknown[][]) {
  const rows = [...selectResults];
  const select = vi.fn(() => {
    const current = rows.shift() ?? [];
    return { from: () => ({ where: () => terminal(current) }) };
  });
  const inserted: Array<{ table: unknown; values: unknown }> = [];
  const updated: Array<{ table: unknown; set: Record<string, unknown> }> = [];
  const insert = vi.fn((table: unknown) => ({
    values: vi.fn(async (values: unknown) => {
      inserted.push({ table, values });
      return undefined;
    }),
  }));
  const update = vi.fn((table: unknown) => ({
    set: vi.fn((setValues: Record<string, unknown>) => ({
      where: vi.fn(async () => {
        updated.push({ table, set: setValues });
        return undefined;
      }),
    })),
  }));
  let rolledBack = false;
  const transaction = vi.fn(async (callback: (txn: unknown) => Promise<unknown>) => {
    try {
      return await callback({ select, insert, update, execute: vi.fn(async () => undefined) });
    } catch (error) {
      rolledBack = true;
      throw error;
    }
  });
  return {
    database: { db: { select, transaction } } as unknown as DatabaseService,
    inserted,
    updated,
    transaction,
    get rolledBack() {
      return rolledBack;
    },
  };
}

const father = { parentType: 'FATHER', firstName: 'Reza', lastName: 'Ahmadi', nationalId: '0499370899', phoneNumber: '09121111111', isPrimaryContact: true };
const mother = { parentType: 'MOTHER', firstName: 'Sara', lastName: 'Ahmadi', nationalId: '0067749811', phoneNumber: '09122222222', isPrimaryContact: false };

const baseInput: GuidedEnrollmentData = {
  student: { firstName: 'Ali', lastName: 'Ahmadi', nationalId: '0013540394' },
  guardian: {
    firstName: 'Reza',
    lastName: 'Ahmadi',
    nationalId: '0499370899',
    relationshipType: 'FATHER',
  },
  homePhone: '02122113333',
  father,
  mother,
  emergencyContact: { firstName: 'Maryam', lastName: 'Ahmadi', relationship: 'Aunt', phoneNumber: '09123333333' },
  address: { title: 'Home', province: 'Tehran', city: 'Tehran', streetAddress: 'Street', postalCode: '1234567890', latitude: 35.7, longitude: 51.3 },
  school: { schoolId: 'school-1', educationLevel: 'Primary', grade: 'First' },
  service: { serviceType: 'BUS', paymentPlanType: 'INSTALLMENTS' },
};

const schoolResult = [{ id: 'school-1', educationOptions: [{ level: 'Primary', grades: ['First'] }] }];
const capacityResults = [[{ studentLimit: 2 }], [{ count: 0 }]];
const standardSelectResults = [
  schoolResult,
  [],
  ...capacityResults,
  [],
  [{ phoneNumber: '09121111111' }],
  [father, mother],
  [],
];

const adminAudit = { adminId: 'admin-1', ipAddress: '127.0.0.1' };

describe('admin guided enrollment transaction', () => {
  it('rolls back and emits no notification when the required audit write fails', async () => {
    const mock = buildMockDb(standardSelectResults);
    const createNotification = vi.fn();
    const auditFailure = new Error('audit unavailable');
    const audit = { recordInTransaction: vi.fn().mockRejectedValue(auditFailure) } as unknown as AuditPort;
    const service = new RegistrationsService(
      mock.database,
      { create: createNotification, enqueueInTransaction: vi.fn(async () => undefined) } as unknown as InAppNotificationService,
      audit,
    );

    await expect(
      service.createGuidedEnrollment('family-1', baseInput, adminAudit),
    ).rejects.toBe(auditFailure);

    expect(mock.rolledBack).toBe(true);
    expect(audit.recordInTransaction).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ actorId: 'admin-1', action: 'ADMIN_FAMILY_ENROLLMENT_CREATED' }),
    );
    expect(createNotification).not.toHaveBeenCalled();
  });

  it('signs the contract on behalf of the parent and records a cash prepayment through the payment domain', async () => {
    const mock = buildMockDb(standardSelectResults);
    const auditCalls: Array<{ action: string; newValues?: Record<string, unknown>; actorType?: string }> = [];
    const audit = {
      recordInTransaction: vi.fn(async (_txn: unknown, record: { action: string; newValues?: Record<string, unknown>; actorType?: string }) => {
        auditCalls.push(record);
      }),
    } as unknown as AuditPort;
    const createNotification = vi.fn();
    const enqueueInTransaction = vi.fn(async () => undefined);
    const service = new RegistrationsService(
      mock.database,
      { create: createNotification, enqueueInTransaction } as unknown as InAppNotificationService,
      audit,
    );

    const result = await service.createGuidedEnrollment('family-1', baseInput, adminAudit, {
      signContractOnBehalf: { reason: 'والد در دفتر حاضر شد', source: 'in_person' },
      cashPrepayment: {
        referenceNumber: 'receipt-001',
        paidAt: '2026-08-08T10:00:00.000Z',
        description: 'پیش‌پرداخت نقدی',
      },
    });

    expect(result.status).toBe('ENROLLED');

    const signedContract = mock.updated.filter(({ set }) => set.contractStatus === 'ACCEPTED');
    expect(signedContract).toHaveLength(1);
    expect(signedContract[0].set).toEqual(
      expect.objectContaining({
        contractStatus: 'ACCEPTED',
        acceptedByAdminId: 'admin-1',
        signerRole: 'ADMIN',
        signerReason: 'والد در دفتر حاضر شد',
        signerSource: 'in_person',
      }),
    );

    const registrationUpdates = mock.updated.filter(({ set }) => set.registrationStatus);
    expect(registrationUpdates.some(({ set }) => set.registrationStatus === 'CONTRACT_ACCEPTED')).toBe(true);
    expect(registrationUpdates.some(({ set }) => set.registrationStatus === 'ENROLLED')).toBe(true);

    const prepaymentItems = mock.updated.filter(({ set }) => set.itemStatus === 'PAID');
    expect(prepaymentItems).toHaveLength(1);
    expect(prepaymentItems[0].set).toEqual(expect.objectContaining({ paidAmount: 40_000_000 }));

    expect(mock.updated.some(({ set }) => set.planStatus === 'COMPLETED')).toBe(true);

    const paymentRows = mock.inserted.filter(
      ({ values }) => (values as { [key: string]: unknown }).paymentMethod === 'MANUAL_ADMIN_ENTRY',
    );
    expect(paymentRows).toHaveLength(1);
    expect(paymentRows[0].values).toEqual(
      expect.objectContaining({
        paymentMethod: 'MANUAL_ADMIN_ENTRY',
        transactionStatus: 'SUCCEEDED',
        gatewayTransactionId: 'receipt-001',
        recordedByAdminId: 'admin-1',
        amount: 40_000_000,
      }),
    );

    expect(mock.inserted.some(({ table }) => table === users)).toBe(false);

    expect(auditCalls).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ action: 'CONTRACT_ACCEPTED_BY_ADMIN', actorType: 'ADMIN' }),
        expect.objectContaining({
          action: 'ADMIN_CASH_PREPAYMENT_RECORDED',
          newValues: expect.objectContaining({ referenceNumber: 'receipt-001', registrationStatus: 'ENROLLED' }),
        }),
        expect.objectContaining({
          action: 'ADMIN_FAMILY_ENROLLMENT_CREATED',
          newValues: expect.objectContaining({ status: 'ENROLLED' }),
        }),
      ]),
    );
    expect(createNotification).not.toHaveBeenCalled();
    expect(enqueueInTransaction).toHaveBeenCalled();
  });

  it('rejects a cash prepayment when the contract was not signed on behalf', async () => {
    const mock = buildMockDb(standardSelectResults);
    const audit = { recordInTransaction: vi.fn(async () => undefined) } as unknown as AuditPort;
    const createNotification = vi.fn();
    const service = new RegistrationsService(
      mock.database,
      { create: createNotification, enqueueInTransaction: vi.fn(async () => undefined) } as unknown as InAppNotificationService,
      audit,
    );

    const actions: AdminEnrollmentActions = {
      cashPrepayment: { referenceNumber: 'receipt-001' },
    };

    await expect(
      service.createGuidedEnrollment('family-1', baseInput, adminAudit, actions),
    ).rejects.toMatchObject({ code: 'CONTRACT_ACCEPTANCE_REQUIRED' });

    expect(mock.rolledBack).toBe(true);
    expect(
      mock.inserted.some(({ values }) => (values as { [key: string]: unknown }).paymentMethod === 'MANUAL_ADMIN_ENTRY'),
    ).toBe(false);
  });

  it('rejects a cash prepayment without a receipt or reference number before touching the database', async () => {
    const mock = buildMockDb(standardSelectResults);
    const audit = { recordInTransaction: vi.fn(async () => undefined) } as unknown as AuditPort;
    const createNotification = vi.fn();
    const service = new RegistrationsService(
      mock.database,
      { create: createNotification, enqueueInTransaction: vi.fn(async () => undefined) } as unknown as InAppNotificationService,
      audit,
    );

    const actions: AdminEnrollmentActions = {
      signContractOnBehalf: { reason: 'حضور در دفتر' },
      cashPrepayment: { referenceNumber: '   ' },
    };

    await expect(
      service.createGuidedEnrollment('family-1', baseInput, adminAudit, actions),
    ).rejects.toMatchObject({ code: 'CASH_RECEIPT_REQUIRED' });

    expect(mock.transaction).not.toHaveBeenCalled();
    expect(createNotification).not.toHaveBeenCalled();
  });

  it('rejects a repeated admin submission for an already-registered student without duplicating the profile', async () => {
    const mock = buildMockDb([schoolResult, [{ id: 'existing-student' }]]);
    const audit = { recordInTransaction: vi.fn(async () => undefined) } as unknown as AuditPort;
    const createNotification = vi.fn();
    const service = new RegistrationsService(
      mock.database,
      { create: createNotification, enqueueInTransaction: vi.fn(async () => undefined) } as unknown as InAppNotificationService,
      audit,
    );

    await expect(
      service.createGuidedEnrollment('family-1', baseInput, adminAudit),
    ).rejects.toMatchObject({ code: 'DUPLICATE_NATIONAL_ID' });

    expect(mock.transaction).not.toHaveBeenCalled();
    expect(mock.inserted.some(({ table }) => table === users)).toBe(false);
    expect(createNotification).not.toHaveBeenCalled();
  });

  it('uses the family verified account phone for the guardian without creating a duplicate account', async () => {
    const mock = buildMockDb([
      schoolResult,
      [],
      [{ studentLimit: 2 }],
      [{ count: 0 }],
      [],
      [{ phoneNumber: '09121111111' }],
      [],
      [],
    ]);
    const audit = { recordInTransaction: vi.fn(async () => undefined) } as unknown as AuditPort;
    const createNotification = vi.fn();
    const service = new RegistrationsService(
      mock.database,
      { create: createNotification, enqueueInTransaction: vi.fn(async () => undefined) } as unknown as InAppNotificationService,
      audit,
    );

    await service.createGuidedEnrollment('family-1', baseInput, adminAudit);

    const guardianRow = mock.inserted.find(
      ({ values }) => (values as { [key: string]: unknown }).parentType === 'GUARDIAN',
    );
    expect(guardianRow).toBeDefined();
    expect((guardianRow?.values as { [key: string]: unknown }).phoneNumber).toBe('09121111111');
    expect(mock.inserted.some(({ table }) => table === users)).toBe(false);
  });
});
