import { describe, expect, it, vi } from 'vitest';
import { PaymentsService } from './payments.service';
import { paymentTransactions } from '../../database/schemas';

const item = {
  id: 'schedule-1',
  paymentPlanId: 'plan-1',
  amount: 5000,
  itemStatus: 'PENDING',
};

function databaseHarness() {
  const transactions: any[] = [];
  let tail = Promise.resolve();
  const ownedQuery = {
    innerJoin() {
      return this;
    },
    where() {
      return this;
    },
    async limit() {
      return [{ item }];
    },
  };
  const db = {
    select: () => ({ from: (table: unknown) => table === paymentTransactions ? {
      where: () => ({ limit: async () => transactions.slice(-1) }),
    } : ownedQuery }),
    update: () => ({ set: (changes: any) => ({ where: () => ({ returning: async () => {
      const row = transactions.find((entry) => entry.transactionStatus === (changes.transactionStatus === 'REQUESTING' ? 'CREATED' : 'REQUESTING'));
      if (!row) return [];
      Object.assign(row, changes);
      return [{ id: row.id }];
    } }) }) }),
    transaction: async (work: (txn: any) => Promise<unknown>) => {
      const previous = tail;
      let release!: () => void;
      tail = new Promise<void>((resolve) => (release = resolve));
      await previous;
      let attempted: any;
      let selectCount = 0;
      const txn = {
        insert: () => ({
          values: (value: any) => {
            attempted = value;
            return {
              onConflictDoNothing: () => ({
                returning: async () => {
                  const duplicate = transactions.find(
                    (row) =>
                      (row.userId === value.userId && row.paymentMethod === value.paymentMethod && row.idempotencyKey === value.idempotencyKey) ||
                      (row.paymentScheduleItemId === value.paymentScheduleItemId && ['CREATED', 'REQUESTING', 'PENDING'].includes(row.transactionStatus)),
                  );
                  if (duplicate) return [];
                  const stored = { ...value, requestedAt: new Date() };
                  transactions.push(stored);
                  return [safe(stored)];
                },
              }),
            };
          },
        }),
        select: () => ({
          from: () => ({
            where: () => ({
              limit: async () => {
                const activeQuery = selectCount++ > 0;
                const found = transactions.find(
                  (row) =>
                    row.userId === attempted.userId &&
                    row.paymentMethod === attempted.paymentMethod &&
                    row.idempotencyKey === attempted.idempotencyKey,
                );
                const active = transactions.find((row) => row.userId === attempted.userId && row.paymentScheduleItemId === attempted.paymentScheduleItemId && ['CREATED', 'REQUESTING', 'PENDING'].includes(row.transactionStatus));
                return activeQuery ? (active ? [safe(active)] : []) : found ? [{ ...safe(found), idempotencyFingerprint: found.idempotencyFingerprint }] : [];
              },
            }),
          }),
        }),
      };
      try {
        return await work(txn);
      } finally {
        release();
      }
    },
  };
  return { db: { db }, transactions };
}

function safe(row: any) {
  const {
    id,
    paymentPlanId,
    paymentScheduleItemId,
    amount,
    paymentMethod,
    transactionStatus,
    requestedAt,
  } = row;
  return {
    id,
    paymentPlanId,
    paymentScheduleItemId,
    amount,
    paymentMethod,
    transactionStatus,
    requestedAt,
  };
}

function service(harness = databaseHarness()) {
  const gateway = { enabled: true, request: vi.fn(async ({ orderId }: { orderId: string }) => ({ authority: '123456', checkoutUrl: 'https://gateway.zibal.ir/start/123456', orderId })) };
  return { harness, gateway, payments: new PaymentsService(harness.db as never, gateway as never, {} as never, undefined, { zibalCallbackBaseUrl: 'https://example.test' } as never) };
}

describe('online payment idempotency', () => {
  it('rejects before any database access when the gateway feature is disabled', async () => {
    let touchedDatabase = false;
    const db = {
      db: {
        select: () => {
          touchedDatabase = true;
          throw new Error('unexpected');
        },
      },
    };
    const payments = new PaymentsService(db as never, { enabled: false } as never, {} as never);

    await expect(
      payments.startOnlinePayment('schedule-1', 'user-1', 'request-123'),
    ).rejects.toMatchObject({ code: 'PAYMENT_GATEWAY_UNAVAILABLE', status: 503 });
    expect(touchedDatabase).toBe(false);

    await expect(
      payments.verifyOnlinePayment('transaction-1', 'user-1', 'authority'),
    ).rejects.toMatchObject({ code: 'PAYMENT_GATEWAY_UNAVAILABLE', status: 503 });
    expect(touchedDatabase).toBe(false);
  });

  it.each(['', '   ', 'short', 'bad key!', `a${'x'.repeat(128)}`])(
    'rejects a missing, blank, malformed, or oversized key %#',
    async (key) => {
      const { payments } = service();
      await expect(payments.startOnlinePayment('schedule-1', 'user-1', key)).rejects.toMatchObject({
        code: 'VALIDATION_ERROR',
        status: 400,
      });
    },
  );

  it('returns the same owned safe result for an identical replay', async () => {
    const { payments } = service();
    const first = await payments.startOnlinePayment('schedule-1', 'user-1', 'request-123');
    const replay = await payments.startOnlinePayment('schedule-1', 'user-1', 'request-123');
    expect(replay).toEqual(first);
    expect(replay).not.toHaveProperty('userId');
    expect(replay).not.toHaveProperty('idempotencyKey');
    expect(replay).not.toHaveProperty('idempotencyFingerprint');
  });

  it('reuses one active checkout and rejects key reuse for another schedule item', async () => {
    const { payments, harness } = service();
    await payments.startOnlinePayment('schedule-1', 'user-1', 'request-123');
    await expect(
      payments.startOnlinePayment('schedule-1', 'user-2', 'request-123'),
    ).rejects.toMatchObject({ code: 'IDEMPOTENCY_CONFLICT' });
    await expect(
      payments.startOnlinePayment('schedule-2', 'user-1', 'request-123'),
    ).rejects.toMatchObject({
      code: 'IDEMPOTENCY_CONFLICT',
      status: 409,
    });
    expect(harness.transactions).toHaveLength(1);
  });

  it('creates one transaction and returns the same result to concurrent identical requests', async () => {
    const { payments, harness } = service();
    const results = await Promise.allSettled([
      payments.startOnlinePayment('schedule-1', 'user-1', 'parallel-123'),
      payments.startOnlinePayment('schedule-1', 'user-1', 'parallel-123'),
    ]);
    expect(harness.transactions).toHaveLength(1);
    expect(results.some((result) => result.status === 'fulfilled')).toBe(true);
    await expect(payments.startOnlinePayment('schedule-1', 'user-1', 'parallel-123')).resolves.toHaveProperty('checkoutUrl');
  });
});
