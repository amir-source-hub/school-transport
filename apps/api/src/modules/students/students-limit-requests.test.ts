import { describe, expect, it, vi } from 'vitest';
import type { DatabaseService } from '../../database/database.service';
import type { InAppNotificationService } from '../../infrastructure/notifications/in-app-notification.service';
import { StudentsService } from './students.service';

function buildChain(rows: unknown[]) {
  const thenable = {
    from: vi.fn(),
    where: vi.fn(),
    for: vi.fn(),
    limit: vi.fn(),
    then: (onFulfilled: (value: unknown) => unknown) => Promise.resolve(rows).then(onFulfilled),
  };
  thenable.from.mockReturnValue(thenable);
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

function insertChain() {
  const chain = { values: vi.fn() };
  chain.values.mockResolvedValue(undefined);
  return chain;
}

function makeService(selectResults: unknown[][]) {
  const select = vi.fn(() => buildChain(selectResults.shift() ?? []));
  const update = vi.fn(() => updateChain());
  const insert = vi.fn(() => insertChain());
  const transaction = vi.fn(async (callback: (txn: unknown) => Promise<unknown>) =>
    callback({ select, update, insert }),
  );
  const notifications = { enqueueInTransaction: vi.fn() };
  const audit = { recordInTransaction: vi.fn() };
  const service = new StudentsService(
    { db: { transaction } } as unknown as DatabaseService,
    notifications as unknown as InAppNotificationService,
    audit as never,
  );
  return { service, notifications, audit, select, update, insert };
}

const pendingRequest = {
  id: 'request-1',
  userId: 'account-1',
  currentLimit: 2,
  requestedLimit: 3,
  reason: 'دو فرزند دیگر به خانواده اضافه شدند',
  status: 'PENDING',
};

describe('createLimitRequest', () => {
  it('creates a PENDING request for the next limit and notifies the owner', async () => {
    const created = { ...pendingRequest, reason: 'دو فرزند دیگر' };
    const { service, notifications, insert } = makeService([[{ studentLimit: 2 }], [], [created]]);

    const result = await service.createLimitRequest('account-1', 'دو فرزند دیگر');

    expect(result.requestedLimit).toBe(3);
    expect(result.status).toBe('PENDING');
    expect(insert).toHaveBeenCalledTimes(1);
    expect(notifications.enqueueInTransaction).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ notificationType: 'LIMIT_REQUEST_CREATED' }),
    );
  });

  it('rejects a second pending request for the same account', async () => {
    const { service, insert } = makeService([[{ studentLimit: 2 }], [{ id: 'request-9' }]]);

    await expect(service.createLimitRequest('account-1', 'another student')).rejects.toMatchObject({
      code: 'LIMIT_REQUEST_ALREADY_PENDING',
      status: 409,
    });
    expect(insert).not.toHaveBeenCalled();
  });
});

describe('approveLimitRequest', () => {
  it('locks the request, verifies PENDING, raises the limit once, and marks APPROVED', async () => {
    const updated = { ...pendingRequest, status: 'APPROVED', reviewedByAdminId: 'admin-1' };
    const { service, notifications, audit, select, update } = makeService([
      [pendingRequest],
      [updated],
    ]);

    const result = await service.approveLimitRequest('request-1', 'admin-1');

    expect(result.status).toBe('APPROVED');
    expect(result.requestedLimit).toBe(3);
    const locked = select.mock.results[0].value;
    expect(locked.for).toHaveBeenCalledWith('update');
    expect(update).toHaveBeenCalledTimes(2);
    expect(audit.recordInTransaction).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ action: 'LIMIT_REQUEST_APPROVED', entityId: 'request-1' }),
    );
    expect(notifications.enqueueInTransaction).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ notificationType: 'LIMIT_REQUEST_APPROVED' }),
    );
  });

  it('refuses to approve a request that is no longer pending', async () => {
    const resolved = { ...pendingRequest, status: 'APPROVED' };
    const { service, update, audit } = makeService([[resolved]]);

    await expect(service.approveLimitRequest('request-1', 'admin-1')).rejects.toMatchObject({
      code: 'LIMIT_REQUEST_NOT_PENDING',
      status: 409,
    });
    expect(update).not.toHaveBeenCalled();
    expect(audit.recordInTransaction).not.toHaveBeenCalled();
  });
});

describe('rejectLimitRequest', () => {
  it('marks the request REJECTED with the supplied reason and records the reviewer', async () => {
    const updated = {
      ...pendingRequest,
      status: 'REJECTED',
      rejectionReason: 'دلیل کافی ارائه نشده',
      reviewedByAdminId: 'admin-1',
    };
    const { service, notifications, audit, select } = makeService([[pendingRequest], [updated]]);

    const result = await service.rejectLimitRequest('request-1', 'admin-1', 'دلیل کافی ارائه نشده');

    expect(result.status).toBe('REJECTED');
    expect(result.rejectionReason).toBe('دلیل کافی ارائه نشده');
    expect(select.mock.results[0].value.for).toHaveBeenCalledWith('update');
    expect(audit.recordInTransaction).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ action: 'LIMIT_REQUEST_REJECTED' }),
    );
    expect(notifications.enqueueInTransaction).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ notificationType: 'LIMIT_REQUEST_REJECTED' }),
    );
  });

  it('refuses to reject an already resolved request', async () => {
    const resolved = { ...pendingRequest, status: 'APPROVED' };
    const { service, audit } = makeService([[resolved]]);

    await expect(service.rejectLimitRequest('request-1', 'admin-1')).rejects.toMatchObject({
      code: 'LIMIT_REQUEST_NOT_PENDING',
    });
    expect(audit.recordInTransaction).not.toHaveBeenCalled();
  });
});
