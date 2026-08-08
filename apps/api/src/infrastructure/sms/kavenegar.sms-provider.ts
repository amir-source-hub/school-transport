import { Injectable } from '@nestjs/common';
import { KavenegarClient } from './kavenegar.client';
import type { SmsProvider, SmsSendResult } from './sms-provider.port';

@Injectable()
export class KavenegarSmsProvider implements SmsProvider {
  constructor(private readonly client: KavenegarClient) {}

  async send(input: {
    phoneNumber: string;
    message: string;
    idempotencyKey: string;
    correlationId: string;
  }): Promise<SmsSendResult> {
    const entry = await this.client.sendMessage({
      receptor: input.phoneNumber,
      message: input.message,
      idempotencyKey: input.idempotencyKey,
    });
    return { providerMessageId: String(entry.messageid), status: entry.status };
  }
}
