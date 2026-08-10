import { describe, expect, it } from 'vitest';
import { PaymentsService } from './payments.service';

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
    select: () => ({ from: () => ownedQuery }),
    transaction: async (work: (txn: any) => Promise<unknown>) => {
      const previous = tail;
      let release!: () => void;
      tail = new Promise<void>((resolve) => (release = resolve));
      await previous;
      let attempted: any;
      const txn = {
        insert: () => ({
          values: (value: any) => {
            attempted = value;
            return {
              onConflictDoNothing: () => ({
                returning: async () => {
                  const duplicate = transactions.find(
                    (row) =>
                      row.userId === value.userId &&
                      row.paymentMethod === value.paymentMethod &&
                      row.idempotencyKey === value.idempotencyKey,
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
                const found = transactions.find(
                  (row) =>
                    row.userId === attempted.userId &&
                    row.paymentMethod === attempted.paymentMethod &&
                    row.idempotencyKey === attempted.idempotencyKey,
                );
                return found
                  ? [{ ...safe(found), idempotencyFingerprint: found.idempotencyFingerprint }]
                  : [];
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
  return { harness, payments: new PaymentsService(harness.db as never, {} as never, {} as never) };
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

  it('allows the same key for another user but rejects reuse for another schedule item', async () => {
    const { payments, harness } = service();
    await payments.startOnlinePayment('schedule-1', 'user-1', 'request-123');
    await expect(
      payments.startOnlinePayment('schedule-1', 'user-2', 'request-123'),
    ).resolves.toBeTruthy();
    await expect(
      payments.startOnlinePayment('schedule-2', 'user-1', 'request-123'),
    ).rejects.toMatchObject({
      code: 'IDEMPOTENCY_CONFLICT',
      status: 409,
    });
    expect(harness.transactions).toHaveLength(2);
  });

  it('creates one transaction and returns the same result to concurrent identical requests', async () => {
    const { payments, harness } = service();
    const results = await Promise.all([
      payments.startOnlinePayment('schedule-1', 'user-1', 'parallel-123'),
      payments.startOnlinePayment('schedule-1', 'user-1', 'parallel-123'),
    ]);
    expect(harness.transactions).toHaveLength(1);
    expect(results[1]).toEqual(results[0]);
  });
});
