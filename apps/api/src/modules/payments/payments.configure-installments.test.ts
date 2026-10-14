import { describe, expect, it, vi } from 'vitest';
import { PaymentsService } from './payments.service';
import { paymentPlans, paymentScheduleItems } from '../../database/schemas';

function harness(plan: any, installments: any[] = [], prepaymentPaid = true, history: any[] = []) {
  const enqueueInTransaction = vi.fn(async () => undefined);
  const updatePlan = vi.fn(() => ({ where: async () => undefined }));
  const insertItems = vi.fn(async () => undefined);
  const db = {
    select: () => ({
      from: () => ({
        where: () => ({
          limit: async () => [plan],
        }),
      }),
    }),
    transaction: async (work: (txn: any) => Promise<unknown>) => {
      const txn = {
        delete: () => ({ where: async () => undefined }),
        insert: () => ({ values: insertItems }),
        update: () => ({ set: updatePlan }),
        select: () => ({
          from: (table: any) => ({
            where: () => {
              const rows =
                table === paymentPlans
                  ? [plan]
                  : table === paymentScheduleItems
                    ? [
                        {
                          id: 'prepayment-1',
                          itemType: 'PREPAYMENT',
                          itemStatus: prepaymentPaid ? 'PAID' : 'PENDING',
                        },
                        ...installments,
                      ]
                    : history;
              return Object.assign(Promise.resolve(rows), { for: async () => rows });
            },
            innerJoin: () => ({
              innerJoin: () => ({
                innerJoin: () => ({
                  where: () => ({ limit: async () => [{ userId: 'user-1' }] }),
                }),
              }),
            }),
          }),
        }),
      };
      return work(txn);
    },
  };
  return {
    payments: new PaymentsService(
      { db } as never,
      {} as never,
      {
        enqueueInTransaction,
      } as never,
    ),
    enqueueInTransaction,
    updatePlan,
    insertItems,
  };
}

const plan = {
  id: 'plan-1',
  planType: 'ADMIN_CONFIGURED',
  prepaymentAmount: 1_000_000,
  createdAt: new Date('2026-08-01T00:00:00.000Z'),
};

describe('configure installment dates', () => {
  it.each(['COMPLETED', 'CANCELLED'])(
    'reopens a %s plan after paid prepayment',
    async (planStatus) => {
      const { payments, updatePlan } = harness({ ...plan, planStatus });
      await payments.configureInstallments('plan-1', [
        { amount: 500_000, dueDate: '2026-09-23T00:00:00.000Z' },
      ]);
      expect(updatePlan).toHaveBeenCalledWith(
        expect.objectContaining({
          planStatus: 'ACTIVE',
          completedAt: null,
        }),
      );
    },
  );

  it('requires paid prepayment even for a completed plan', async () => {
    const { payments } = harness({ ...plan, planStatus: 'COMPLETED' }, [], false);
    await expect(payments.configureInstallments('plan-1', [])).rejects.toMatchObject({
      code: 'PREPAYMENT_REQUIRED',
    });
  });

  it('keeps paid installments without transaction rows and adds a remaining installment', async () => {
    const paid = {
      id: 'paid-1',
      itemType: 'INSTALLMENT',
      itemStatus: 'PAID',
      sequenceNumber: 1,
      amount: 500_000,
      dueDate: new Date('2026-09-23T00:00:00.000Z'),
    };
    const { payments, insertItems, updatePlan } = harness({ ...plan, planStatus: 'COMPLETED' }, [
      paid,
    ]);
    await payments.configureInstallments('plan-1', [
      { id: paid.id, amount: paid.amount, dueDate: paid.dueDate.toISOString() },
      { amount: 600_000, dueDate: '2026-10-23T00:00:00.000Z' },
    ]);
    expect(insertItems).toHaveBeenCalledTimes(1);
    expect(updatePlan).toHaveBeenCalledWith(expect.objectContaining({ planStatus: 'ACTIVE' }));
  });

  it('rejects removal of a paid installment', async () => {
    const { payments } = harness(plan, [
      {
        id: 'paid-1',
        itemType: 'INSTALLMENT',
        itemStatus: 'PAID',
        sequenceNumber: 1,
        amount: 500_000,
        dueDate: new Date('2026-09-23T00:00:00.000Z'),
      },
    ]);
    await expect(payments.configureInstallments('plan-1', [])).rejects.toMatchObject({
      code: 'INSTALLMENT_HAS_PAYMENT_HISTORY',
    });
  });

  it('keeps a fully paid schedule completed', async () => {
    const paid = {
      id: 'paid-1',
      itemType: 'INSTALLMENT',
      itemStatus: 'PAID',
      sequenceNumber: 1,
      amount: 500_000,
      dueDate: new Date('2026-09-23T00:00:00.000Z'),
    };
    const { payments, updatePlan, insertItems } = harness(plan, [paid]);
    await payments.configureInstallments('plan-1', [
      { id: paid.id, amount: paid.amount, dueDate: paid.dueDate.toISOString() },
    ]);
    expect(updatePlan).toHaveBeenCalledWith(expect.objectContaining({ planStatus: 'COMPLETED' }));
    expect(insertItems).not.toHaveBeenCalled();
  });

  it('rejects changes to an unpaid installment with receipt history', async () => {
    const old = {
      id: 'receipt-1',
      itemType: 'INSTALLMENT',
      itemStatus: 'PENDING',
      sequenceNumber: 1,
      amount: 500_000,
      dueDate: new Date('2026-09-23T00:00:00.000Z'),
    };
    const { payments } = harness(plan, [old], true, [{ id: old.id }]);
    await expect(
      payments.configureInstallments('plan-1', [
        { id: old.id, amount: 600_000, dueDate: old.dueDate.toISOString() },
      ]),
    ).rejects.toMatchObject({ code: 'INSTALLMENT_HAS_PAYMENT_HISTORY' });
  });

  it('changes an unpaid installment amount and date', async () => {
    const old = {
      id: 'unpaid-1',
      itemType: 'INSTALLMENT',
      itemStatus: 'PENDING',
      sequenceNumber: 1,
      amount: 500_000,
      dueDate: new Date('2026-09-23T00:00:00.000Z'),
    };
    const { payments, insertItems } = harness(plan, [old]);
    await payments.configureInstallments('plan-1', [
      { id: old.id, amount: 600_000, dueDate: '2026-10-23T00:00:00.000Z' },
    ]);
    expect(insertItems).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 600_000,
        dueDate: new Date('2026-10-23T00:00:00.000Z'),
      }),
    );
  });

  it('removes an unpaid schedule and keeps the plan available for reconfiguration', async () => {
    const { payments, updatePlan } = harness(plan, [
      {
        id: 'unpaid-1',
        itemType: 'INSTALLMENT',
        itemStatus: 'PENDING',
        sequenceNumber: 1,
        amount: 500_000,
        dueDate: new Date('2026-09-23T00:00:00.000Z'),
      },
    ]);
    await payments.configureInstallments('plan-1', []);
    expect(updatePlan).toHaveBeenCalledWith(
      expect.objectContaining({
        planStatus: 'ACTIVE',
        installmentCount: 0,
      }),
    );
  });

  it('accepts strictly increasing dates after the plan start', async () => {
    const { payments, enqueueInTransaction } = harness(plan);
    await expect(
      payments.configureInstallments('plan-1', [
        { amount: 500_000, dueDate: '2026-09-23T00:00:00.000Z' },
        { amount: 500_000, dueDate: '2026-10-23T00:00:00.000Z' },
      ]),
    ).resolves.toMatchObject({ planId: 'plan-1', totalAmount: 2_000_000, installmentCount: 2 });
    expect(enqueueInTransaction).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        eventId: expect.stringMatching(/^PAYMENT_PLAN_READY:plan-1:user-1:/),
        userId: 'user-1',
        notificationType: 'PAYMENT_PLAN_READY',
        relatedEntityType: 'PAYMENT_PLAN',
        relatedEntityId: 'plan-1',
      }),
    );
  });

  it('rejects an unordered due date with a per-row Persian error', async () => {
    const { payments } = harness(plan);
    await expect(
      payments.configureInstallments('plan-1', [
        { amount: 500_000, dueDate: '2026-10-23T00:00:00.000Z' },
        { amount: 500_000, dueDate: '2026-09-23T00:00:00.000Z' },
      ]),
    ).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
      details: {
        'items.1.dueDate': expect.arrayContaining([expect.stringMatching(/پس از تاریخ قسط قبلی/)]),
      },
    });
  });

  it('rejects duplicate due dates', async () => {
    const { payments } = harness(plan);
    await expect(
      payments.configureInstallments('plan-1', [
        { amount: 500_000, dueDate: '2026-09-23T00:00:00.000Z' },
        { amount: 500_000, dueDate: '2026-09-23T00:00:00.000Z' },
      ]),
    ).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
      details: {
        'items.1.dueDate': expect.arrayContaining([expect.stringMatching(/تکرار/)]),
      },
    });
  });

  it('rejects a due date before the plan start', async () => {
    const { payments } = harness(plan);
    await expect(
      payments.configureInstallments('plan-1', [
        { amount: 500_000, dueDate: '2026-07-23T00:00:00.000Z' },
      ]),
    ).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
      details: {
        'items.0.dueDate': expect.arrayContaining([expect.stringMatching(/شروع برنامه پرداخت/)]),
      },
    });
  });
});
