import { afterEach, describe, expect, it, vi } from 'vitest';
import { ValidationError } from '../../common/errors';
import {
  assertGatewayVerification,
  MockPaymentGateway,
  UnconfiguredPaymentGateway,
  ZibalPaymentGateway,
} from './payment-gateway';

afterEach(() => vi.unstubAllGlobals());

describe('payment gateway boundary', () => {
  it('accepts a verified exact-amount result', () => {
    expect(
      assertGatewayVerification(1000, {
        verified: true,
        amount: 1000,
        transactionId: 'gateway-tx-1',
      }),
    ).toBe('gateway-tx-1');
  });

  it.each([
    { verified: false, amount: 1000, transactionId: undefined },
    { verified: true, amount: 999, transactionId: 'gateway-tx-1' },
    { verified: true, amount: 1000, transactionId: undefined },
  ])('rejects invalid verification result %#', (result) => {
    expect(() => assertGatewayVerification(1000, result)).toThrow(ValidationError);
  });

  it('fails closed while no provider is approved', async () => {
    await expect(new UnconfiguredPaymentGateway().verify()).rejects.toMatchObject({
      code: 'PAYMENT_GATEWAY_UNAVAILABLE',
      status: 503,
    });
  });

  it('parses deterministic mock authorities', async () => {
    await expect(
      new MockPaymentGateway().verify({ authority: 'mock:25000:tx_123', amount: 25000 }),
    ).resolves.toEqual({ verified: true, amount: 25000, transactionId: 'tx_123' });
  });
});

describe('Zibal gateway', () => {
  const gateway = new ZibalPaymentGateway({ zibalMerchant: 'merchant-test' } as never);

  it('requests a checkout for the exact rial amount and callback', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ result: 100, trackId: 123456 }) });
    vi.stubGlobal('fetch', fetchMock);
    await expect(gateway.request({ amount: 50_000, callbackUrl: 'https://example.test/return', orderId: 'order-1' }))
      .resolves.toEqual({ authority: '123456', checkoutUrl: 'https://gateway.zibal.ir/start/123456' });
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({ amount: 50_000, callbackUrl: 'https://example.test/return', orderId: 'order-1' });
  });

  it('rejects a provider error even when HTTP succeeds', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ result: 104 }) }));
    await expect(gateway.request({ amount: 50_000, callbackUrl: 'https://example.test/return', orderId: 'order-1' }))
      .rejects.toMatchObject({ code: 'PAYMENT_GATEWAY_ERROR' });
  });

  it.each([100, 201, 202])('parses verification result %s and preserves the reported amount', async (result) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ result, amount: 50_000, refNumber: 'ref-1' }) }));
    await expect(gateway.verify({ authority: '123456', amount: 50_000 }))
      .resolves.toEqual({ verified: result !== 202, amount: 50_000, transactionId: 'ref-1' });
  });
});
