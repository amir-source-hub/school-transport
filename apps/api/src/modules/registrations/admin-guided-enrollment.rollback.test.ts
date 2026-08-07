import { describe, expect, it, vi } from 'vitest';
import type { DatabaseService } from '../../database/database.service';
import type { AuditPort } from '../../common/audit.port';
import type { InAppNotificationService } from '../../infrastructure/notifications/in-app-notification.service';
import { RegistrationsService } from './registrations.service';
import type { GuidedEnrollmentData } from './guided-enrollment';

function terminal(rows: unknown[]) {
  return {
    limit: vi.fn(async () => rows),
    then: (resolve: (value: unknown[]) => unknown, reject: (reason: unknown) => unknown) =>
      Promise.resolve(rows).then(resolve, reject),
  };
}

describe('admin guided enrollment transaction', () => {
  it('rolls back and emits no notification when the required audit write fails', async () => {
    const father = { parentType: 'FATHER', firstName: 'Reza', lastName: 'Ahmadi', nationalId: '0499370899', phoneNumber: '09121111111', isPrimaryContact: true };
    const mother = { parentType: 'MOTHER', firstName: 'Sara', lastName: 'Ahmadi', nationalId: '0067749829', phoneNumber: '09122222222', isPrimaryContact: false };
    const selectResults = [
      [{ id: 'school-1', educationOptions: [{ level: 'Primary', grades: ['First'] }] }],
      [],
      [],
      [{ phoneNumber: father.phoneNumber }],
      [father, mother],
      [],
    ];
    const select = vi.fn(() => {
      const rows = selectResults.shift() ?? [];
      return { from: () => ({ where: () => terminal(rows) }) };
    });
    const write = () => ({ values: vi.fn(async () => undefined) });
    const update = () => ({ set: () => ({ where: vi.fn(async () => undefined) }) });
    let rolledBack = false;
    const transaction = vi.fn(async (callback: (txn: unknown) => Promise<unknown>) => {
      try {
        return await callback({ select, insert: write, update, execute: vi.fn(async () => undefined) });
      } catch (error) {
        rolledBack = true;
        throw error;
      }
    });
    const database = { db: { select, transaction } } as unknown as DatabaseService;
    const createNotification = vi.fn();
    const auditFailure = new Error('audit unavailable');
    const audit = { recordInTransaction: vi.fn().mockRejectedValue(auditFailure) } as unknown as AuditPort;
    const service = new RegistrationsService(
      database,
      { create: createNotification } as unknown as InAppNotificationService,
      audit,
    );
    const input: GuidedEnrollmentData = {
      student: { firstName: 'Ali', lastName: 'Ahmadi', nationalId: '0013540399' },
      guardian: {
        firstName: 'Reza',
        lastName: 'Ahmadi',
        nationalId: '0499370899',
        relationshipType: 'FATHER',
      },
      father,
      mother,
      emergencyContact: { firstName: 'Maryam', lastName: 'Ahmadi', relationship: 'Aunt', phoneNumber: '09123333333' },
      address: { title: 'Home', province: 'Tehran', city: 'Tehran', streetAddress: 'Street', postalCode: '1234567890', latitude: 35.7, longitude: 51.3 },
      school: { schoolId: 'school-1', educationLevel: 'Primary', grade: 'First' },
      service: { serviceType: 'BUS', paymentPlanType: 'INSTALLMENTS' },
    };

    await expect(
      service.createGuidedEnrollment('family-1', input, { adminId: 'admin-1', ipAddress: '127.0.0.1' }),
    ).rejects.toBe(auditFailure);

    expect(rolledBack).toBe(true);
    expect(audit.recordInTransaction).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ actorId: 'admin-1', action: 'ADMIN_FAMILY_ENROLLMENT_CREATED' }),
    );
    expect(createNotification).not.toHaveBeenCalled();
  });
});
