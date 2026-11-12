import { BadRequestException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { GatewayReturnController } from './payments.controller';

describe('Zibal return callback', () => {
  const txId = '01573d4e-93a1-4082-a5de-9b5d98de2e32';

  it('verifies on the server without a browser session, then returns to the result page', async () => {
    const verifyOnlinePayment = vi.fn().mockResolvedValue({ transactionStatus: 'SUCCEEDED' });
    const reply = { redirect: vi.fn() };
    const controller = new GatewayReturnController({ verifyOnlinePayment } as never, { zibalCallbackBaseUrl: 'https://samingasht.ir' } as never);
    await controller.callback(txId, '123456', 'panel', reply as never);
    expect(verifyOnlinePayment).toHaveBeenCalledWith(txId, undefined, '123456');
    expect(reply.redirect).toHaveBeenCalledWith(`https://samingasht.ir/payment-return?txId=${txId}&trackId=123456&mode=panel`, 303);
  });

  it('allows an idempotent confirmation retry without a browser session', async () => {
    const verifyOnlinePayment = vi.fn().mockResolvedValue({ transactionStatus: 'SUCCEEDED' });
    const controller = new GatewayReturnController({ verifyOnlinePayment } as never, { zibalCallbackBaseUrl: 'https://samingasht.ir' } as never);
    await expect(controller.confirm(txId, { gatewayTransactionId: '123456' })).resolves.toMatchObject({ data: { status: 'SUCCEEDED' } });
    expect(verifyOnlinePayment).toHaveBeenCalledWith(txId, undefined, '123456');
  });

  it('returns the browser to a retryable result if verification is temporarily unavailable', async () => {
    const reply = { redirect: vi.fn() };
    const controller = new GatewayReturnController({ verifyOnlinePayment: vi.fn().mockRejectedValue(new Error('gateway timeout')) } as never, { zibalCallbackBaseUrl: 'https://samingasht.ir' } as never);
    await controller.callback(txId, '123456', 'onboarding', reply as never);
    expect(reply.redirect).toHaveBeenCalledWith(expect.stringContaining('mode=onboarding'), 303);
  });

  it('rejects malformed gateway tracking IDs', async () => {
    const controller = new GatewayReturnController({ verifyOnlinePayment: vi.fn() } as never, { zibalCallbackBaseUrl: 'https://samingasht.ir' } as never);
    await expect(controller.callback(txId, 'invalid', 'panel', {} as never)).rejects.toBeInstanceOf(BadRequestException);
  });
});
