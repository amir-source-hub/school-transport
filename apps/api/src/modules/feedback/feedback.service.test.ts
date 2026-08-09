import { ConflictError, NotFoundError } from '../../common/errors';
import { describe, expect, it, vi } from 'vitest';
import type { AuditPort } from '../../common/audit.port';
import type { DatabaseService } from '../../database/database.service';
import type { InAppNotificationService } from '../../infrastructure/notifications/in-app-notification.service';
import { FeedbackService } from './feedback.service';

type QueryRows = unknown[];

function query(rows: QueryRows, orderBy = vi.fn()) {
  const chain: Record<string, unknown> = {};
  Object.assign(chain, {
    from: vi.fn(() => chain),
    where: vi.fn(() => chain),
    orderBy: vi.fn((...args: unknown[]) => {
      orderBy(...args);
      return chain;
    }),
    limit: vi.fn(() => chain),
    offset: vi.fn(() => Promise.resolve(rows)),
    then: (resolve: (value: QueryRows) => unknown) => Promise.resolve(rows).then(resolve),
  });
  return chain;
}

function harness(options: { selects?: QueryRows[]; updates?: QueryRows[] } = {}) {
  const selects = [...(options.selects ?? [])];
  const updates = [...(options.updates ?? [])];
  const orderBy = vi.fn();
  const insertedValues: unknown[] = [];
  const insertReturning: QueryRows = [{ id: 'feedback-new', userId: 'user-1' }];
  const insert = vi.fn(() => ({
    values: vi.fn((values: unknown) => {
      insertedValues.push(values);
      return { returning: vi.fn(async () => insertReturning) };
    }),
  }));
  const update = vi.fn(() => {
    const rows = updates.shift() ?? [];
    const chain: Record<string, unknown> = {};
    Object.assign(chain, {
      set: vi.fn(() => chain),
      where: vi.fn(() => chain),
      returning: vi.fn(async () => rows),
    });
    return chain;
  });
  const select = vi.fn(() => query(selects.shift() ?? [], orderBy));
  const transaction = vi.fn(async (callback: (txn: unknown) => Promise<unknown>) =>
    callback({ select, insert, update }),
  );
  const db = { select, insert, update, transaction };
  const notifications = { enqueueInTransaction: vi.fn(async () => undefined) };
  const audit = {
    record: vi.fn(async () => undefined),
    recordInTransaction: vi.fn(async () => undefined),
  };
  const service = new FeedbackService(
    { db } as unknown as DatabaseService,
    notifications as unknown as InAppNotificationService,
    audit as unknown as AuditPort,
  );
  return { service, db, insert, insertedValues, orderBy, notifications, audit };
}

const feedback = {
  id: 'feedback-1',
  userId: 'user-1',
  status: 'NEW',
  version: 1,
};

describe('FeedbackService security and concurrency', () => {
  it('does not reveal or associate a student owned by another account', async () => {
    const { service, insert } = harness({ selects: [[]] });
    await expect(
      service.create('user-1', {
        category: 'SERVICE',
        subject: 'موضوع معتبر',
        message: 'این پیام برای آزمون مالکیت ثبت شده است.',
        studentId: '00000000-0000-4000-8000-000000000002',
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
    expect(insert).not.toHaveBeenCalled();
  });

  it('derives the owner from authentication and lists with stable pagination', async () => {
    const { service, insertedValues, orderBy } = harness({
      selects: [[{ id: 'student-1' }], [feedback], [{ value: 1 }]],
    });
    await service.create('user-1', {
      category: 'SERVICE',
      subject: ' موضوع معتبر ',
      message: ' پیام معتبر برای سرویس ',
      studentId: '00000000-0000-4000-8000-000000000001',
    });
    expect(insertedValues[0]).toEqual(
      expect.objectContaining({ userId: 'user-1', subject: 'موضوع معتبر' }),
    );

    await expect(service.listMine('user-1', { page: 1, pageSize: 10 })).resolves.toEqual({
      items: [feedback],
      total: 1,
    });
    expect(orderBy).toHaveBeenCalledWith(expect.anything(), expect.anything());
  });

  it('allows exactly one simultaneous response/close transition for one version', async () => {
    const updated = { ...feedback, status: 'ANSWERED', version: 2 };
    const { service, notifications, audit } = harness({ updates: [[updated], []] });
    const outcomes = await Promise.allSettled([
      service.respond('feedback-1', 'admin-1', 'پاسخ امن مدیریت', 1),
      service.close('feedback-1', 'admin-2', 1),
    ]);
    expect(outcomes.filter((outcome) => outcome.status === 'fulfilled')).toHaveLength(1);
    expect(outcomes.filter((outcome) => outcome.status === 'rejected')).toHaveLength(1);
    expect(
      (outcomes.find((outcome) => outcome.status === 'rejected') as PromiseRejectedResult).reason,
    ).toBeInstanceOf(ConflictError);
    expect(notifications.enqueueInTransaction).toHaveBeenCalledTimes(1);
    expect(notifications.enqueueInTransaction).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        eventId: 'FEEDBACK_RESPONSE:feedback-1',
        notificationType: 'FEEDBACK_RESPONSE',
        userId: 'user-1',
      }),
    );
    expect(audit.recordInTransaction).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ newValues: { status: 'ANSWERED' } }),
    );
    expect(JSON.stringify(audit.recordInTransaction.mock.calls)).not.toContain('پاسخ امن مدیریت');
  });
});
