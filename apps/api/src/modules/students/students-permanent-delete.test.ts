import { describe, expect, it, vi } from 'vitest';
import type { DatabaseService } from '../../database/database.service';
import type { InAppNotificationService } from '../../infrastructure/notifications/in-app-notification.service';
import { StudentsService } from './students.service';

function selectChain(rows: unknown[]) {
  const chain: Record<string, unknown> = {};
  Object.assign(chain, {
    from: vi.fn(() => chain),
    innerJoin: vi.fn(() => chain),
    where: vi.fn(() => chain),
    limit: vi.fn(async () => rows),
    then: (resolve: (value: unknown) => unknown) => Promise.resolve(rows).then(resolve),
  });
  return chain;
}

function deleteChain() {
  const chain = { where: vi.fn(async () => undefined) };
  return chain;
}

function harness(familyStudentIds: string[]) {
  const results = [
    [
      {
        id: 'student-1',
        userId: 'family-1',
        schoolId: 'school-1',
        schoolName: 'مدرسه',
        firstName: 'دانش',
        lastName: 'آموز',
      },
    ],
    familyStudentIds.map((id) => ({ id })),
    [{ rawKey: 'raw/student.jpg', canonicalKey: 'canonical/student.jpg' }],
  ];
  const select = vi.fn(() => selectChain(results.shift() ?? []));
  const execute = vi.fn(async () => undefined);
  const remove = vi.fn(() => deleteChain());
  const transaction = vi.fn(async (work: (txn: unknown) => Promise<unknown>) =>
    work({ execute, delete: remove }),
  );
  const audit = { recordInTransaction: vi.fn(async () => undefined) };
  const storage = { deleteObject: vi.fn(async () => undefined) };
  const service = new StudentsService(
    { db: { select, transaction } } as unknown as DatabaseService,
    { enqueueInTransaction: vi.fn() } as unknown as InAppNotificationService,
    audit as never,
    storage as never,
  );
  return { service, execute, remove, audit, storage };
}

describe('permanent admin student deletion', () => {
  it('enables the transaction-local erasure scope before deleting an enrolled student', async () => {
    const { service, execute, remove, audit, storage } = harness(['student-1', 'student-2']);

    await expect(
      service.permanentlyDeleteByAdmin('student-1', {
        adminId: 'admin-1',
        ipAddress: '127.0.0.1',
      }),
    ).resolves.toEqual({ deleted: true, familyDeleted: false });

    expect(execute).toHaveBeenCalledTimes(1);
    expect(execute.mock.invocationCallOrder[0]).toBeLessThan(remove.mock.invocationCallOrder[0]);
    expect(audit.recordInTransaction).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        action: 'STUDENT_PERMANENTLY_DELETED',
        entityId: 'student-1',
      }),
    );
    expect(storage.deleteObject).toHaveBeenCalledWith('raw/student.jpg');
    expect(storage.deleteObject).toHaveBeenCalledWith('canonical/student.jpg');
  });

  it('deletes the entire family account when its only student is removed', async () => {
    const { service, execute, remove, audit } = harness(['student-1']);

    await expect(
      service.permanentlyDeleteByAdmin('student-1', { adminId: 'admin-1' }),
    ).resolves.toEqual({ deleted: true, familyDeleted: true });

    expect(execute).toHaveBeenCalledTimes(1);
    expect(remove).toHaveBeenCalledTimes(2);
    expect(audit.recordInTransaction).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ action: 'FAMILY_PERMANENTLY_DELETED', entityId: 'family-1' }),
    );
  });
});
