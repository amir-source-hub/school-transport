import { describe, expect, it } from 'vitest';
import { ValidationError } from '../../common/errors';
import { assertGatewayVerification, UnconfiguredPaymentGateway } from './payment-gateway';

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
});
