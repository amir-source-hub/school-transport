import { Global, Module } from '@nestjs/common';
import { ConfigService } from '../../config/config.service';
import { KavenegarClient } from './kavenegar.client';
import { KavenegarSmsProvider } from './kavenegar.sms-provider';
import { SMS_PROVIDER } from './sms-provider.port';
import { SmsNotificationService } from './sms-notification.service';
import { UnconfiguredSmsProvider } from './unconfigured.sms-provider';

@Global()
@Module({
  providers: [
    KavenegarClient,
    KavenegarSmsProvider,
    UnconfiguredSmsProvider,
    SmsNotificationService,
    {
      provide: SMS_PROVIDER,
      inject: [ConfigService, KavenegarSmsProvider, UnconfiguredSmsProvider],
      useFactory: (
        config: ConfigService,
        kavenegar: KavenegarSmsProvider,
        unconfigured: UnconfiguredSmsProvider,
      ) => (config.smsProvider === 'kavenegar' ? kavenegar : unconfigured),
    },
  ],
  exports: [KavenegarClient, SmsNotificationService, SMS_PROVIDER],
})
export class SmsModule {}
