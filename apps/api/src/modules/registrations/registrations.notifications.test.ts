import { describe, expect, it, vi } from 'vitest';
import type { AuditPort } from '../../common/audit.port';
import type { DatabaseService } from '../../database/database.service';
import type { InAppNotificationService } from '../../infrastructure/notifications/in-app-notification.service';
import { RegistrationsService } from './registrations.service';

type Transition = 'startReview' | 'approve' | 'reject' | 'requestCorrection';

function terminal(rows: unknown[]) {
  return { limit: vi.fn(async () => rows) };
}

function harness(initialStatus: string, finalStatus: string) {
  const registration = {
    id: 'registration-1',
    studentId: 'student-1',
    registrationStatus: initialStatus,
  };
  const updatedRegistration = { ...registration, registrationStatus: finalStatus };
  const mainResults = [[registration], [updatedRegistration]];
  const select = vi.fn(() => ({
    from: () => ({ where: () => terminal(mainResults.shift() ?? []) }),
  }));
  const txn = {
    update: () => ({
      set: () => ({ where: () => ({ returning: async () => [{ id: 'registration-1' }] }) }),
    }),
    insert: () => ({ values: async () => undefined }),
    select: () => ({
      from: () => ({
        innerJoin: () => ({ where: () => terminal([{ userId: 'user-1' }]) }),
      }),
    }),
  };
  const db = { select, transaction: async (work: (value: typeof txn) => unknown) => work(txn) };
  const enqueueInTransaction = vi.fn(async () => undefined);
  const service = new RegistrationsService(
    { db } as unknown as DatabaseService,
    { enqueueInTransaction } as unknown as InAppNotificationService,
    { recordInTransaction: vi.fn() } as unknown as AuditPort,
  );
  return { service, enqueueInTransaction };
}

const cases: Array<{
  method: Transition;
  initial: string;
  final: string;
  type: string;
  extra: string[];
}> = [
  {
    method: 'startReview',
    initial: 'SUBMITTED',
    final: 'UNDER_REVIEW',
    type: 'ENROLLMENT_UNDER_REVIEW',
    extra: [],
  },
  {
    method: 'approve',
    initial: 'UNDER_REVIEW',
    final: 'APPROVED',
    type: 'ENROLLMENT_APPROVED',
    extra: [],
  },
  {
    method: 'reject',
    initial: 'UNDER_REVIEW',
    final: 'REJECTED',
    type: 'ENROLLMENT_REJECTED',
    extra: ['مدارک کافی نیست'],
  },
  {
    method: 'requestCorrection',
    initial: 'UNDER_REVIEW',
    final: 'NEEDS_CORRECTION',
    type: 'ENROLLMENT_NEEDS_CORRECTION',
    extra: ['نشانی را اصلاح کنید'],
  },
];

describe('registration decision notification producers', () => {
  for (const testCase of cases) {
    it(`enqueues ${testCase.type} in the transition transaction`, async () => {
      const { service, enqueueInTransaction } = harness(testCase.initial, testCase.final);
      await (service[testCase.method] as (...args: string[]) => Promise<unknown>)(
        'registration-1',
        'admin-1',
        ...testCase.extra,
      );
      expect(enqueueInTransaction).toHaveBeenCalledOnce();
      expect(enqueueInTransaction).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          eventId: `${testCase.type}:registration-1:user-1`,
          userId: 'user-1',
          notificationType: testCase.type,
          relatedEntityType: 'REGISTRATION',
          relatedEntityId: 'registration-1',
        }),
      );
    });
  }
});
