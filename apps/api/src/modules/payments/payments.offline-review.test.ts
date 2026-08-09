import { describe, expect, it, vi } from 'vitest';
import type { AuditPort } from '../../common/audit.port';
import type { DatabaseService } from '../../database/database.service';
import {
  offlinePaymentSubmissions,
  paymentPlans,
  paymentScheduleItems,
  paymentTransactions,
  serviceRegistrations,
} from '../../database/schemas';
import type { InAppNotificationService } from '../../infrastructure/notifications/in-app-notification.service';
import { PaymentsService } from './payments.service';

type Row = Record<string, unknown>;

function terminal(rows: Row[]) {
  const chain: Record<string, unknown> = {};
  Object.assign(chain, {
    innerJoin: vi.fn(() => chain),
    where: vi.fn(() => chain),
    for: vi.fn(() => chain),
    limit: vi.fn(async () => rows),
    then: (resolve: (value: Row[]) => unknown) => Promise.resolve(rows).then(resolve),
  });
  return chain;
}

function reviewHarness(selectResults: Row[][], updateResults: Row[][] = []) {
  const selects = [...selectResults];
  const updatesToReturn = [...updateResults];
  const inserted: Array<{ table: unknown; values: unknown }> = [];
  const updated: Array<{ table: unknown; values: Row }> = [];
  const select = vi.fn(() => ({ from: vi.fn(() => terminal(selects.shift() ?? [])) }));
  const insert = vi.fn((table: unknown) => ({
    values: vi.fn(async (values: unknown) => {
      inserted.push({ table, values });
      return undefined;
    }),
  }));
  const update = vi.fn((table: unknown) => {
    const returned = updatesToReturn.shift() ?? [];
    const chain: Record<string, unknown> = {};
    Object.assign(chain, {
      set: vi.fn((values: Row) => {
        updated.push({ table, values });
        return chain;
      }),
      where: vi.fn(() => chain),
      returning: vi.fn(async () => returned),
      then: (resolve: (value: undefined) => unknown) => Promise.resolve(undefined).then(resolve),
    });
    return chain;
  });
  const txn = { select, insert, update };
  const transaction = vi.fn(async (work: (value: typeof txn) => Promise<unknown>) => work(txn));
  const enqueueInTransaction = vi.fn(async () => undefined);
  const recordInTransaction = vi.fn(async () => undefined);
  const service = new PaymentsService(
    { db: { transaction } } as unknown as DatabaseService,
    {} as never,
    { enqueueInTransaction } as unknown as InAppNotificationService,
    { recordInTransaction } as unknown as AuditPort,
  );
  return {
    service,
    transaction,
    inserted,
    updated,
    enqueueInTransaction,
    recordInTransaction,
  };
}

const submission = {
  id: 'submission-1',
  paymentPlanId: 'plan-1',
  paymentScheduleItemId: 'item-1',
  payerUserId: 'user-1',
  submittedAmount: 2_000_000,
  paidAt: new Date('2026-08-08T10:00:00Z'),
  status: 'PENDING_REVIEW',
  version: 3,
};
const scheduleItem = {
  id: 'item-1',
  paymentPlanId: 'plan-1',
  itemType: 'PREPAYMENT',
  itemStatus: 'PENDING',
  amount: 2_000_000,
};

describe('offline payment review transaction', () => {
  it('approves exactly once inside one transaction and records all financial side effects', async () => {
    const approved = { ...submission, status: 'APPROVED', version: 4 };
    const harness = reviewHarness(
      [
        [submission],
        [scheduleItem],
        [{ id: 'plan-1' }],
        [{ ...scheduleItem, itemStatus: 'PAID' }],
        [{ id: 'registration-1' }],
      ],
      [[approved], [], [], []],
    );

    await expect(
      harness.service.approveOfflinePayment('submission-1', 'admin-1', 3),
    ).resolves.toMatchObject({ status: 'APPROVED', version: 4 });

    expect(harness.transaction).toHaveBeenCalledOnce();
    expect(harness.inserted).toEqual([
      expect.objectContaining({
        table: paymentTransactions,
        values: expect.objectContaining({
          paymentMethod: 'OFFLINE_RECEIPT',
          transactionStatus: 'SUCCEEDED',
          paymentScheduleItemId: 'item-1',
          amount: 2_000_000,
          recordedByAdminId: 'admin-1',
        }),
      }),
    ]);
    expect(harness.updated).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          table: offlinePaymentSubmissions,
          values: expect.objectContaining({ status: 'APPROVED', version: 4 }),
        }),
        expect.objectContaining({
          table: paymentScheduleItems,
          values: expect.objectContaining({ itemStatus: 'PAID', paidAmount: 2_000_000 }),
        }),
        expect.objectContaining({
          table: paymentPlans,
          values: expect.objectContaining({ planStatus: 'COMPLETED' }),
        }),
        expect.objectContaining({
          table: serviceRegistrations,
          values: expect.objectContaining({ registrationStatus: 'ENROLLED' }),
        }),
      ]),
    );
    expect(harness.enqueueInTransaction).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        eventId: 'PAYMENT_APPROVED:submission-1:user-1',
        notificationType: 'PAYMENT_APPROVED',
      }),
    );
    expect(harness.recordInTransaction).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ action: 'OFFLINE_PAYMENT_APPROVED', actorId: 'admin-1' }),
    );
  });

  it('rejects stale/repeated approval before inserting a transaction or changing totals', async () => {
    const harness = reviewHarness([[{ ...submission, status: 'APPROVED', version: 4 }]]);
    await expect(
      harness.service.approveOfflinePayment('submission-1', 'admin-2', 3),
    ).rejects.toMatchObject({ code: 'OFFLINE_PAYMENT_NOT_PENDING' });
    expect(harness.inserted).toEqual([]);
    expect(harness.updated).toEqual([]);
    expect(harness.enqueueInTransaction).not.toHaveBeenCalled();
    expect(harness.recordInTransaction).not.toHaveBeenCalled();
  });

  it('rejects an amount mismatch before inserting or updating financial records', async () => {
    const harness = reviewHarness([
      [submission],
      [{ ...scheduleItem, amount: 2_500_000 }],
      [{ id: 'plan-1' }],
    ]);
    await expect(
      harness.service.approveOfflinePayment('submission-1', 'admin-1', 3),
    ).rejects.toMatchObject({ code: 'OFFLINE_PAYMENT_AMOUNT_MISMATCH' });
    expect(harness.inserted).toEqual([]);
    expect(harness.updated).toEqual([]);
  });

  it('rejects only the submission and emits audited correction-required notification', async () => {
    const rejected = { ...submission, status: 'REJECTED', version: 4 };
    const harness = reviewHarness([[submission]], [[rejected]]);
    await expect(
      harness.service.rejectOfflinePayment('submission-1', 'admin-1', 'تصویر ناخوانا است', 3),
    ).resolves.toEqual({ rejected: true });
    expect(harness.inserted).toEqual([]);
    expect(harness.updated).toEqual([
      expect.objectContaining({
        table: offlinePaymentSubmissions,
        values: expect.objectContaining({
          status: 'REJECTED',
          version: 4,
          rejectionReason: 'تصویر ناخوانا است',
        }),
      }),
    ]);
    expect(harness.enqueueInTransaction).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ notificationType: 'OFFLINE_PAYMENT_CORRECTION_REQUIRED' }),
    );
    expect(harness.recordInTransaction).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ action: 'OFFLINE_PAYMENT_REJECTED' }),
    );
  });

  it('propagates notification/audit failure so the enclosing database transaction can roll back', async () => {
    const harness = reviewHarness([[submission]], [[{ ...submission, status: 'REJECTED' }]]);
    harness.enqueueInTransaction.mockRejectedValueOnce(new Error('outbox unavailable'));
    await expect(
      harness.service.rejectOfflinePayment('submission-1', 'admin-1', 'تصویر ناخوانا است', 3),
    ).rejects.toThrow('outbox unavailable');
    expect(harness.recordInTransaction).not.toHaveBeenCalled();
  });
});
