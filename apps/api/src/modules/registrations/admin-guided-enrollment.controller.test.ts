import { describe, expect, it, vi } from 'vitest';
import type { RegistrationsService } from './registrations.service';
import { AdminRegistrationsController, RegistrationsController } from './registrations.controller';
import type { GuidedEnrollmentData } from './guided-enrollment';
import type { AdminEnrollmentActions } from './admin-guided-enrollment';

describe('admin guided enrollment handoff', () => {
  it('creates a parent-owned pending handoff and audits the administrator', async () => {
    const createGuidedEnrollment = vi.fn().mockResolvedValue({
      registrationId: 'registration-1',
      studentId: 'student-1',
      contractId: 'contract-1',
      scheduleItemId: 'schedule-1',
      prepaymentAmount: 40_000_000,
      contractText: 'contract',
      status: 'CONTRACT_READY',
    });
    const controller = new AdminRegistrationsController({
      createGuidedEnrollment,
    } as unknown as RegistrationsService);
    const input = { school: { schoolId: 'school-1' } } as GuidedEnrollmentData;

    const response = await controller.createForFamily(
      'family-1',
      { user: { id: 'admin-1' }, ip: '127.0.0.1' } as never,
      input as never,
    );

    expect(createGuidedEnrollment).toHaveBeenCalledWith(
      'family-1',
      input,
      {
        adminId: 'admin-1',
        ipAddress: '127.0.0.1',
      },
      undefined,
    );
    expect(response.data).toEqual({
      registrationId: 'registration-1',
      studentId: 'student-1',
      contractId: 'contract-1',
      scheduleItemId: 'schedule-1',
      prepaymentAmount: 40_000_000,
      status: 'CONTRACT_READY',
      parentActionRequired: true,
    });
    expect(controller).not.toHaveProperty('accept');
  });

  it('forwards admin actions and reports a completed enrollment when the admin signs and records cash', async () => {
    const createGuidedEnrollment = vi.fn().mockResolvedValue({
      registrationId: 'registration-1',
      studentId: 'student-1',
      contractId: 'contract-1',
      scheduleItemId: 'schedule-1',
      prepaymentAmount: 40_000_000,
      contractText: 'contract',
      status: 'ENROLLED',
    });
    const controller = new AdminRegistrationsController({
      createGuidedEnrollment,
    } as unknown as RegistrationsService);
    const input = {} as GuidedEnrollmentData;
    const adminActions: AdminEnrollmentActions = {
      signContractOnBehalf: { reason: 'حضور در دفتر', source: 'in_person' },
      cashPrepayment: { referenceNumber: 'receipt-001' },
    };

    const response = await controller.createForFamily(
      'family-1',
      { user: { id: 'admin-1' }, ip: '127.0.0.1' } as never,
      { ...input, adminActions } as never,
    );

    expect(createGuidedEnrollment).toHaveBeenCalledWith(
      'family-1',
      expect.objectContaining({ adminActions }),
      expect.objectContaining({ adminId: 'admin-1' }),
      adminActions,
    );
    expect(response.data).toEqual({
      registrationId: 'registration-1',
      studentId: 'student-1',
      contractId: 'contract-1',
      scheduleItemId: 'schedule-1',
      prepaymentAmount: 40_000_000,
      status: 'ENROLLED',
      parentActionRequired: false,
    });
  });

  it('does not attach an ADMIN audit context to parent-led enrollment', async () => {
    const createGuidedEnrollment = vi.fn().mockResolvedValue({ registrationId: 'registration-1' });
    const controller = new RegistrationsController({
      createGuidedEnrollment,
    } as unknown as RegistrationsService);
    const input = {} as GuidedEnrollmentData;

    await controller.createGuided(
      { user: { id: 'family-1', role: 'PARENT', sessionId: 'session-1' } } as never,
      input as never,
    );

    expect(createGuidedEnrollment).toHaveBeenCalledWith('family-1', input);
    expect(createGuidedEnrollment.mock.calls[0]).toHaveLength(2);
  });
});
