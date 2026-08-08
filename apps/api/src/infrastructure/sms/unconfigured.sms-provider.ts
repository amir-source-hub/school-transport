import { Injectable } from '@nestjs/common';
import { AppError } from '../../common/errors';
import type { SmsProvider } from './sms-provider.port';

@Injectable()
export class UnconfiguredSmsProvider implements SmsProvider {
  async send(): Promise<never> {
    throw new AppError('SMS_PROVIDER_UNAVAILABLE', 'SMS delivery is not configured.', 503);
  }
}
