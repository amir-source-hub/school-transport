import { describe, expect, it, vi } from 'vitest';
import { PaymentsService } from './payments.service';

function harness(plan: any) {
  const enqueueInTransaction = vi.fn(async () => undefined);
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
        insert: () => ({ values: async () => undefined }),
        update: () => ({ set: () => ({ where: async () => undefined }) }),
        select: () => ({
          from: () => ({
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
  };
}

const plan = {
  id: 'plan-1',
  planType: 'ADMIN_CONFIGURED',
  prepaymentAmount: 1_000_000,
  createdAt: new Date('2026-08-01T00:00:00.000Z'),
};

describe('configure installment dates', () => {
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
        eventId: 'PAYMENT_PLAN_READY:plan-1:user-1',
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
