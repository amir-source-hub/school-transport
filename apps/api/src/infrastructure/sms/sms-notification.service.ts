import { Inject, Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { ConfigService } from '../../config/config.service';
import { DatabaseService } from '../../database/database.service';
import { notificationConsents, users } from '../../database/schemas';
import { safeSmsMessage, smsPurposeFor } from './notification-sms.catalog';
import { SMS_PROVIDER, type SmsProvider } from './sms-provider.port';

export type SmsDispatchOutcome =
  | { status: 'DISABLED' | 'SKIPPED_NO_PHONE' | 'SKIPPED_NO_CONSENT'; purpose: string }
  | { status: 'SENT'; purpose: string; providerMessageId: string };

@Injectable()
export class SmsNotificationService {
  constructor(
    private readonly db: DatabaseService,
    private readonly config: ConfigService,
    @Inject(SMS_PROVIDER) private readonly provider: SmsProvider,
  ) {}

  async dispatch(input: {
    eventId: string;
    userId: string;
    notificationType: string;
  }): Promise<SmsDispatchOutcome> {
    const purpose = smsPurposeFor(input.notificationType);
    if (this.config.smsProvider === 'none') return { status: 'DISABLED', purpose };
    const [user] = await this.db.db
      .select({ phoneNumber: users.phoneNumber })
      .from(users)
      .where(eq(users.id, input.userId))
      .limit(1);
    if (!user?.phoneNumber) return { status: 'SKIPPED_NO_PHONE', purpose };
    if (purpose === 'OPTIONAL_UPDATES') {
      const [consent] = await this.db.db
        .select({ granted: notificationConsents.granted })
        .from(notificationConsents)
        .where(
          and(
            eq(notificationConsents.userId, input.userId),
            eq(notificationConsents.channel, 'SMS'),
            eq(notificationConsents.purpose, purpose),
          ),
        )
        .limit(1);
      if (!consent?.granted) return { status: 'SKIPPED_NO_CONSENT', purpose };
    }
    const result = await this.provider.send({
      phoneNumber: user.phoneNumber,
      message: safeSmsMessage(input.notificationType),
      idempotencyKey: `${input.eventId}:SMS`,
      correlationId: input.eventId,
    });
    return { status: 'SENT', purpose, providerMessageId: result.providerMessageId };
  }
}
