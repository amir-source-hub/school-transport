import { Injectable } from '@nestjs/common';
import { AppError, ValidationError } from '../../common/errors';
import { ConfigService } from '../../config/config.service';

export const PAYMENT_GATEWAY = Symbol('PAYMENT_GATEWAY');

export type GatewayVerification = {
  verified: boolean;
  amount: number;
  transactionId?: string;
};

export interface PaymentGateway {
  readonly enabled?: boolean;
  request?(input: { amount: number; callbackUrl: string; orderId: string }): Promise<{ authority: string; checkoutUrl: string }>;
  verify(input: { authority: string; amount: number }): Promise<GatewayVerification>;
}

@Injectable()
export class ZibalPaymentGateway implements PaymentGateway {
  readonly enabled = true;
  constructor(private readonly config: ConfigService) {}
  private get merchant() {
    const merchant = this.config.zibalMerchant;
    if (!merchant) throw new AppError('PAYMENT_GATEWAY_UNAVAILABLE', 'Zibal merchant is not configured.', 503);
    return merchant;
  }
  async request(input: { amount: number; callbackUrl: string; orderId: string }) {
    const response = await fetch('https://gateway.zibal.ir/v1/request', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ merchant: this.merchant, amount: input.amount, callbackUrl: input.callbackUrl, orderId: input.orderId }),
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) throw new AppError('PAYMENT_GATEWAY_ERROR', 'Zibal request failed.', 502);
    const data = await response.json() as { result?: number; trackId?: number };
    if (data.result !== 100 || !Number.isSafeInteger(data.trackId) || !data.trackId) throw new AppError('PAYMENT_GATEWAY_ERROR', 'Zibal rejected the payment request.', 502);
    return { authority: String(data.trackId), checkoutUrl: `https://gateway.zibal.ir/start/${data.trackId}` };
  }
  async verify(input: { authority: string; amount: number }): Promise<GatewayVerification> {
    const response = await fetch('https://gateway.zibal.ir/v1/verify', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ merchant: this.merchant, trackId: Number(input.authority) }),
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) throw new AppError('PAYMENT_GATEWAY_ERROR', 'Zibal verification failed.', 502);
    const data = await response.json() as { result?: number; amount?: number; refNumber?: number | string };
    return { verified: data.result === 100 || data.result === 201, amount: data.amount ?? -1, transactionId: data.refNumber ? String(data.refNumber) : input.authority };
  }
}

export function assertGatewayVerification(
  expectedAmount: number,
  result: GatewayVerification,
): string {
  if (!result.verified) throw new ValidationError('Payment verification failed.');
  if (result.amount !== expectedAmount) throw new ValidationError('Payment amount mismatch.');
  if (!result.transactionId) throw new ValidationError('Gateway transaction ID is missing.');
  return result.transactionId;
}

@Injectable()
export class UnconfiguredPaymentGateway implements PaymentGateway {
  readonly enabled = false;
  async verify(): Promise<GatewayVerification> {
    throw new AppError(
      'PAYMENT_GATEWAY_UNAVAILABLE',
      'Online payment verification is not configured.',
      503,
    );
  }
}

@Injectable()
export class MockPaymentGateway implements PaymentGateway {
  readonly enabled = true;
  async verify(input: { authority: string; amount: number }): Promise<GatewayVerification> {
    const match = /^mock:(\d+):([A-Za-z0-9_-]+)$/.exec(input.authority);
    if (!match) return { verified: false, amount: input.amount };
    return {
      verified: true,
      amount: Number(match[1]),
      transactionId: match[2],
    };
  }
}
