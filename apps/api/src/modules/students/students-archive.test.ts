import { describe, expect, it, vi } from 'vitest';
import type { DatabaseService } from '../../database/database.service';
import type { InAppNotificationService } from '../../infrastructure/notifications/in-app-notification.service';
import { StudentsService } from './students.service';

function buildChain(rows: unknown[]) {
  const thenable = {
    from: vi.fn(),
    innerJoin: vi.fn(),
    where: vi.fn(),
    for: vi.fn(),
    limit: vi.fn(),
    then: (onFulfilled: (value: unknown) => unknown) =>
      Promise.resolve(rows).then(onFulfilled),
  };
  thenable.from.mockReturnValue(thenable);
  thenable.innerJoin.mockReturnValue(thenable);
  thenable.where.mockReturnValue(thenable);
  thenable.for.mockReturnValue(thenable);
  thenable.limit.mockReturnValue(thenable);
  return thenable;
}

function updateChain() {
  const chain = { set: vi.fn(), where: vi.fn() };
  chain.set.mockReturnValue(chain);
  chain.where.mockReturnValue(chain);
  return chain;
}

function makeService(selectResults: unknown[][]) {
  const select = vi.fn(() => buildChain(selectResults.shift() ?? []));
  const update = vi.fn(() => updateChain());
  const transaction = vi.fn(async (callback: (txn: unknown) => Promise<unknown>) =>
    callback({ select, update }),
  );
  const notifications = { enqueueInTransaction: vi.fn() };
  const audit = { recordInTransaction: vi.fn() };
  const service = new StudentsService(
    { db: { transaction, select, update } } as unknown as DatabaseService,
    notifications as unknown as InAppNotificationService,
    audit as never,
  );
  return { service, audit, select, update };
}

const activeStudent = {
  id: 'student-1',
  userId: 'account-1',
  schoolId: 'school-1',
  schoolName: 'مدرسه نمونه',
  firstName: 'علی',
  lastName: 'احمدی',
  nationalId: '0499370899',
  grade: 'اول',
  className: null,
  isActive: true,
};

describe('setActiveByAdmin', () => {
  it('archives the student and audits actor, ip, and reason', async () => {
    const archived = { ...activeStudent, isActive: false };
    const { service, audit, update } = makeService([[activeStudent], [archived]]);

    await service.setActiveByAdmin('student-1', false, {
      adminId: 'admin-1',
      ipAddress: '127.0.0.1',
      reason: 'انتقال به مدرسه دیگر',
    });

    expect(update).toHaveBeenCalledTimes(1);
    expect(audit.recordInTransaction).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        actorType: 'ADMIN',
        actorId: 'admin-1',
        action: 'STUDENT_ARCHIVED',
        entityType: 'STUDENT',
        entityId: 'student-1',
        previousValues: { isActive: true, archiveReason: 'انتقال به مدرسه دیگر' },
        newValues: { isActive: false },
        ipAddress: '127.0.0.1',
      }),
    );
  });

  it('activates a previously archived student and audits the action', async () => {
    const reactivated = { ...activeStudent, isActive: true };
    const { service, audit } = makeService([[{ ...activeStudent, isActive: false }], [reactivated]]);

    await service.setActiveByAdmin('student-1', true, { adminId: 'admin-2' });

    expect(audit.recordInTransaction).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        action: 'STUDENT_ACTIVATED',
        actorId: 'admin-2',
        previousValues: { isActive: false, archiveReason: null },
      }),
    );
  });

  it('throws when the student does not exist', async () => {
    const { service, update, audit } = makeService([[]]);

    await expect(
      service.setActiveByAdmin('missing', true, { adminId: 'admin-1' }),
    ).rejects.toMatchObject({ status: 404 });
    expect(update).not.toHaveBeenCalled();
    expect(audit.recordInTransaction).not.toHaveBeenCalled();
  });
});
