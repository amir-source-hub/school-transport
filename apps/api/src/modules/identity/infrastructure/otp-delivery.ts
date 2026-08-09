import { Injectable } from '@nestjs/common';
import { AppError } from '../../../common/errors';
import { OtpDelivery } from '../application/otp-delivery.port';
import { KavenegarClient } from '../../../infrastructure/sms/kavenegar.client';

@Injectable()
export class ConsoleOtpDelivery implements OtpDelivery {
  // Explicitly development-only. AuthService returns the code in its development response;
  // delivery must not duplicate phone numbers or OTP values into process logs.
  async send(_input: { phoneNumber: string; purpose: string; code: string }): Promise<void> {}
}

@Injectable()
export class UnconfiguredOtpDelivery implements OtpDelivery {
  async send(): Promise<void> {
    throw new AppError('OTP_PROVIDER_UNAVAILABLE', 'OTP delivery is not configured.', 503);
  }
}

@Injectable()
export class KavenegarOtpDelivery implements OtpDelivery {
  constructor(private readonly client: KavenegarClient) {}

  async send(input: { phoneNumber: string; purpose: string; code: string }): Promise<void> {
    await this.client.sendOtp({ receptor: input.phoneNumber, token: input.code });
  }
}
