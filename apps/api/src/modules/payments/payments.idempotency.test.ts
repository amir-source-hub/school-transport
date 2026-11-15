import { describe, expect, it, vi } from 'vitest';
import { PaymentsService } from './payments.service';
import type { GatewayVerification } from './payment-gateway';
import { offlinePaymentSubmissions, paymentTransactions } from '../../database/schemas';

const item = {
  id: 'schedule-1',
  paymentPlanId: 'plan-1',
  amount: 5000,
  itemStatus: 'PENDING',
};

function databaseHarness() {
  const transactions: any[] = [];
  const pendingReceipts: any[] = [];
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
    } : table === offlinePaymentSubmissions ? {
      where: () => ({ limit: async () => pendingReceipts }),
    } : ownedQuery }),
    update: () => ({ set: (changes: any) => ({ where: () => {
      const apply = () => {
        const previousStatus = changes.transactionStatus === 'REQUESTING' ? 'CREATED'
          : ['CHECKOUT_EXPIRED', 'CHECKOUT_CANCELLED'].includes(changes.failureCode) ? 'PENDING' : 'REQUESTING';
        const row = transactions.find((entry) => entry.transactionStatus === previousStatus);
        if (!row) return [];
        Object.assign(row, changes);
        return [{ id: row.id }];
      };
      return { returning: async () => apply(), then: (resolve: (value: unknown) => void) => resolve(apply()) };
    } }) }),
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
  return { db: { db }, transactions, pendingReceipts };
}

function safe(row: any) {
  const {
    id,
    paymentPlanId,
    paymentScheduleItemId,
    amount,
    gatewayFeeAmount,
    paymentMethod,
    transactionStatus,
    requestedAt,
  } = row;
  return {
    id,
    paymentPlanId,
    paymentScheduleItemId,
    amount,
    gatewayFeeAmount,
    paymentMethod,
    transactionStatus,
    requestedAt,
  };
}

function service(harness = databaseHarness()) {
  const gateway = { enabled: true, request: vi.fn(async ({ orderId }: { orderId: string }) => ({ authority: '123456', checkoutUrl: 'https://gateway.zibal.ir/start/123456', orderId })), verify: vi.fn(async (): Promise<GatewayVerification> => ({ verified: false, amount: 5000 })) };
  const payments = new PaymentsService(harness.db as never, gateway as never, {} as never, undefined, { zibalCallbackBaseUrl: 'https://example.test' } as never);
  vi.spyOn(payments, 'getPaymentMode').mockResolvedValue('ONLINE');
  return { harness, gateway, payments };
}

describe('online payment idempotency', () => {
  it('blocks new online checkout when admin selects offline payments', async () => {
    const { payments, harness } = service();
    vi.spyOn(payments, 'getPaymentMode').mockResolvedValue('OFFLINE');
    await expect(payments.startOnlinePayment('schedule-1', 'user-1', 'request-123'))
      .rejects.toMatchObject({ code: 'ONLINE_PAYMENT_DISABLED' });
    expect(harness.transactions).toHaveLength(0);
  });
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
    const { payments, gateway } = service();
    const first = await payments.startOnlinePayment('schedule-1', 'user-1', 'request-123');
    const replay = await payments.startOnlinePayment('schedule-1', 'user-1', 'request-123');
    expect(replay).toEqual(first);
    expect(replay).not.toHaveProperty('userId');
    expect(replay).not.toHaveProperty('idempotencyKey');
    expect(replay).not.toHaveProperty('idempotencyFingerprint');
    expect(gateway.request).toHaveBeenCalledWith(expect.objectContaining({
      amount: 27_000,
      callbackUrl: expect.stringMatching(/^https:\/\/example\.test\/api\/v1\/payments\/online\/callback\?txId=/),
    }));
  });

  it('reconciles a paid checkout before offering the gateway again', async () => {
    const { payments, gateway } = service();
    await payments.startOnlinePayment('schedule-1', 'user-1', 'request-123');
    gateway.verify.mockResolvedValueOnce({ verified: true, amount: 5000, transactionId: 'bank-ref', resultCode: 100 });
    const verify = vi.spyOn(payments, 'verifyOnlinePayment').mockResolvedValue({ transactionStatus: 'SUCCEEDED' } as never);
    const result = await payments.startOnlinePayment('schedule-1', 'user-1', 'another-123');
    expect(result).toMatchObject({ transactionStatus: 'SUCCEEDED', checkoutUrl: null });
    expect(verify).toHaveBeenCalledWith(expect.any(String), 'user-1', '123456');
  });

  it('releases a ten-minute expired unpaid checkout for a new attempt', async () => {
    const { payments, gateway, harness } = service();
    await payments.startOnlinePayment('schedule-1', 'user-1', 'request-123');
    harness.transactions[0].requestedAt = new Date(Date.now() - 11 * 60_000);
    gateway.verify.mockResolvedValueOnce({ verified: false, resultCode: 202, amount: -1, transactionId: undefined });
    await expect(payments.startOnlinePayment('schedule-1', 'user-1', 'another-123'))
      .resolves.toMatchObject({ transactionStatus: 'PENDING' });
    expect(harness.transactions[0].transactionStatus).toBe('FAILED');
    await expect(payments.startOnlinePayment('schedule-1', 'user-1', 'another-123'))
      .resolves.toMatchObject({ transactionStatus: 'PENDING' });
    expect(gateway.request).toHaveBeenCalledTimes(2);
  });

  it('replaces a checkout cancelled at Zibal on the first retry', async () => {
    const { payments, gateway, harness } = service();
    await payments.startOnlinePayment('schedule-1', 'user-1', 'request-123');
    gateway.verify.mockResolvedValueOnce({ verified: false, resultCode: 202, paymentStatus: 3, amount: -1, transactionId: undefined });
    await expect(payments.startOnlinePayment('schedule-1', 'user-1', 'another-123'))
      .resolves.toMatchObject({ transactionStatus: 'PENDING' });
    expect(harness.transactions[0]).toMatchObject({ transactionStatus: 'FAILED', failureCode: 'CHECKOUT_CANCELLED' });
    expect(gateway.request).toHaveBeenCalledTimes(2);
  });

  it('keeps an unpaid checkout pending while Zibal says it is still waiting', async () => {
    const { payments, gateway, harness } = service();
    await payments.startOnlinePayment('schedule-1', 'user-1', 'request-123');
    harness.transactions[0].requestedAt = new Date(Date.now() - 5 * 60_000);
    gateway.verify.mockResolvedValueOnce({ verified: false, resultCode: 202, paymentStatus: -1, amount: -1, transactionId: undefined });
    await expect(payments.startOnlinePayment('schedule-1', 'user-1', 'another-123'))
      .resolves.toMatchObject({ transactionStatus: 'PENDING' });
    expect(harness.transactions).toHaveLength(1);
  });

  it('checks the tracking ID before replaying a successful verification', async () => {
    const transaction = { id: 'transaction-1', userId: 'user-1', paymentMethod: 'ONLINE_GATEWAY', gatewayAuthority: '123456', transactionStatus: 'SUCCEEDED' };
    const gateway = { enabled: true, verify: vi.fn() };
    const db = { db: { select: () => ({ from: () => ({ where: () => ({ limit: async () => [transaction] }) }) }) } };
    const payments = new PaymentsService(db as never, gateway as never, {} as never);
    await expect(payments.verifyOnlinePayment('transaction-1', undefined, 'wrong')).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
    await expect(payments.verifyOnlinePayment('transaction-1', undefined, '123456')).resolves.toEqual(transaction);
    expect(gateway.verify).not.toHaveBeenCalled();
  });

  it('blocks checkout while an offline receipt awaits review', async () => {
    const { payments, harness } = service();
    harness.pendingReceipts.push({ id: 'receipt-1' });
    await expect(payments.startOnlinePayment('schedule-1', 'user-1', 'request-123'))
      .rejects.toMatchObject({ code: 'PAYMENT_UNDER_REVIEW' });
    expect(harness.transactions).toHaveLength(0);
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
