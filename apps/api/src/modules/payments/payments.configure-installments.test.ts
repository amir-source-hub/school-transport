import { describe, expect, it } from 'vitest';
import { PaymentsService } from './payments.service';

function harness(plan: any) {
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
  return new PaymentsService({ db } as never, {} as never, {
    enqueueInTransaction: async () => undefined,
  } as never);
}

const plan = {
  id: 'plan-1',
  planType: 'ADMIN_CONFIGURED',
  prepaymentAmount: 1_000_000,
  createdAt: new Date('2026-08-01T00:00:00.000Z'),
};

describe('configure installment dates', () => {
  it('accepts strictly increasing dates after the plan start', async () => {
    const payments = harness(plan);
    await expect(
      payments.configureInstallments('plan-1', [
        { amount: 500_000, dueDate: '2026-09-23T00:00:00.000Z' },
        { amount: 500_000, dueDate: '2026-10-23T00:00:00.000Z' },
      ]),
    ).resolves.toMatchObject({ planId: 'plan-1', totalAmount: 2_000_000, installmentCount: 2 });
  });

  it('rejects an unordered due date with a per-row Persian error', async () => {
    const payments = harness(plan);
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
    const payments = harness(plan);
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
    const payments = harness(plan);
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
