import { describe, expect, it, vi } from 'vitest';
import { PaymentsService } from './payments.service';
import { offlinePaymentSubmissions, paymentPlans, paymentScheduleItems, paymentTransactions } from '../../database/schemas';

const approvedSubmission = {
  id: 'submission-1', status: 'APPROVED', version: 2, transactionId: 'transaction-1',
  paymentScheduleItemId: 'item-1', paymentPlanId: 'plan-1', payerUserId: 'user-1',
  receiptObjectKey: 'receipt-1',
};
const item = { id: 'item-1', itemType: 'INSTALLMENT', itemStatus: 'PAID', paymentPlanId: 'plan-1', amount: 100 };
const transaction = { id: 'transaction-1', transactionStatus: 'SUCCEEDED', paymentMethod: 'OFFLINE_RECEIPT', paymentScheduleItemId: 'item-1', paymentPlanId: 'plan-1', userId: 'user-1', amount: 100 };

function harness(rows: unknown[][]) {
  const remaining = [...rows];
  const updates: Array<{ table: unknown; values: Record<string, unknown> }> = [];
  const deletes: unknown[] = [];
  const executed: unknown[] = [];
  const select = () => ({ from: () => {
    const result = remaining.shift() ?? [];
    const terminal = { limit: async () => result, then: (resolve: (value: unknown[]) => unknown) => Promise.resolve(result).then(resolve) };
    const chain = { where: () => ({ ...terminal, for: () => terminal }) };
    return chain;
  } });
  const txn = {
    select,
    execute: async (statement: unknown) => { executed.push(statement); },
    update: (table: unknown) => ({ set: (values: Record<string, unknown>) => ({ where: async () => { updates.push({ table, values }); } }) }),
    delete: (table: unknown) => ({ where: async () => { deletes.push(table); } }),
  };
  const enqueueInTransaction = vi.fn(async () => undefined);
  const recordInTransaction = vi.fn(async () => undefined);
  const deleteObject = vi.fn(async () => undefined);
  const service = new PaymentsService(
    { db: { transaction: async (work: (value: typeof txn) => Promise<unknown>) => work(txn) } } as never,
    {} as never,
    { enqueueInTransaction } as never,
    { recordInTransaction } as never,
    undefined,
    { deleteObject } as never,
  );
  return { service, updates, deletes, executed, enqueueInTransaction, recordInTransaction, deleteObject };
}

describe('offline receipt resubmission request', () => {
  it('reverses an accepted offline payment while retaining its transaction and receipt history', async () => {
    const test = harness([[approvedSubmission], [item], [transaction], [{ ...item, itemStatus: 'PENDING' }], [{ totalAmount: 100 }]]);
    await expect(test.service.resetOfflinePaymentForResubmission('submission-1', 'admin-1', 2)).resolves.toEqual({ reset: true });
    expect(test.updates.find(({ table }) => table === offlinePaymentSubmissions)?.values).toMatchObject({ status: 'SUPERSEDED', version: 3 });
    expect(test.updates.find(({ table }) => table === paymentTransactions)?.values).toMatchObject({ transactionStatus: 'REVERSED', failureCode: 'ADMIN_RECEIPT_RESET' });
    expect(test.updates.find(({ table }) => table === paymentScheduleItems)?.values).toMatchObject({ itemStatus: 'PENDING', paidAmount: 0 });
    expect(test.updates.find(({ table }) => table === paymentPlans)?.values).toMatchObject({ planStatus: 'PENDING' });
    expect(test.executed).toHaveLength(1);
    expect(test.deletes).toHaveLength(0);
    expect(test.deleteObject).not.toHaveBeenCalled();
    expect(test.enqueueInTransaction).toHaveBeenCalledOnce();
    expect(test.recordInTransaction).toHaveBeenCalledOnce();
  });

  it('refuses a stale version before changing any financial state', async () => {
    const test = harness([[approvedSubmission]]);
    await expect(test.service.resetOfflinePaymentForResubmission('submission-1', 'admin-1', 1))
      .rejects.toMatchObject({ code: 'OFFLINE_PAYMENT_CHANGED' });
    expect(test.updates).toHaveLength(0);
    expect(test.executed).toHaveLength(0);
  });

  it('refuses to reverse a transaction unrelated to the approved receipt', async () => {
    const test = harness([[approvedSubmission], [item], [{ ...transaction, paymentScheduleItemId: 'other-item' }]]);
    await expect(test.service.resetOfflinePaymentForResubmission('submission-1', 'admin-1', 2))
      .rejects.toMatchObject({ code: 'OFFLINE_PAYMENT_NOT_RESETTABLE' });
    expect(test.updates).toHaveLength(0);
    expect(test.executed).toHaveLength(0);
  });

  it('removes an unapproved receipt without reversing any payment', async () => {
    const rejected = { ...approvedSubmission, status: 'REJECTED', transactionId: null };
    const test = harness([[rejected], [{ ...item, itemStatus: 'PENDING' }]]);
    await expect(test.service.resetOfflinePaymentForResubmission('submission-1', 'admin-1', 2)).resolves.toEqual({ reset: true });
    expect(test.deletes).toEqual([offlinePaymentSubmissions]);
    expect(test.updates).toHaveLength(0);
    expect(test.executed).toHaveLength(0);
    expect(test.deleteObject).toHaveBeenCalledWith('receipt-1');
  });
});
