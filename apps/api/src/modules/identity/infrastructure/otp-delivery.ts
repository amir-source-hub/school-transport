import { Injectable } from '@nestjs/common';
import { AppError } from '../../../common/errors';
import { OtpDelivery } from '../application/otp-delivery.port';

@Injectable()
export class ConsoleOtpDelivery implements OtpDelivery {
  async send(input: { phoneNumber: string; purpose: string; code: string }): Promise<void> {
    // Explicitly development-only. The module never selects this adapter in production.
    console.warn(
      `[DEV OTP] phone=${input.phoneNumber} purpose=${input.purpose} code=${input.code}`,
    );
  }
}

@Injectable()
export class UnconfiguredOtpDelivery implements OtpDelivery {
  async send(): Promise<void> {
    throw new AppError('OTP_PROVIDER_UNAVAILABLE', 'OTP delivery is not configured.', 503);
  }
}
