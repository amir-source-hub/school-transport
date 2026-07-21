import { Injectable } from '@nestjs/common';
import { AppError, ValidationError } from '../../common/errors';

export const PAYMENT_GATEWAY = Symbol('PAYMENT_GATEWAY');

export type GatewayVerification = {
  verified: boolean;
  amount: number;
  transactionId?: string;
};

export interface PaymentGateway {
  verify(input: { authority: string; amount: number }): Promise<GatewayVerification>;
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
  async verify(): Promise<GatewayVerification> {
    throw new AppError(
      'PAYMENT_GATEWAY_UNAVAILABLE',
      'Online payment verification is not configured.',
      503,
    );
  }
}
