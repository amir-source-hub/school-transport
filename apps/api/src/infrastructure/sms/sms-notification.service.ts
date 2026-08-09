import { Inject, Injectable, Optional } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { ConfigService } from '../../config/config.service';
import { DatabaseService } from '../../database/database.service';
import { notificationConsents, users } from '../../database/schemas';
import { safeSmsMessage, smsPurposeFor } from './notification-sms.catalog';
import { SMS_PROVIDER, type SmsProvider } from './sms-provider.port';
import { KavenegarProviderError } from './kavenegar.client';
import {
  OperationalMetricsService,
  type MessageCategory,
} from '../metrics/operational-metrics.service';

export type SmsDispatchOutcome =
  | { status: 'DISABLED' | 'SKIPPED_NO_PHONE' | 'SKIPPED_NO_CONSENT'; purpose: string }
  | { status: 'SENT'; purpose: string; providerMessageId: string };

@Injectable()
export class SmsNotificationService {
  constructor(
    private readonly db: DatabaseService,
    private readonly config: ConfigService,
    @Inject(SMS_PROVIDER) private readonly provider: SmsProvider,
    @Optional() private readonly metrics?: OperationalMetricsService,
  ) {}

  async dispatch(input: {
    eventId: string;
    userId: string;
    notificationType: string;
  }): Promise<SmsDispatchOutcome> {
    const purpose = smsPurposeFor(input.notificationType);
    const category: MessageCategory =
      purpose === 'OPTIONAL_UPDATES' ? 'optional_notification' : 'service_notification';
    if (this.config.smsProvider === 'none') {
      this.metrics?.recordMessage(category, 'disabled');
      return { status: 'DISABLED', purpose };
    }
    const [user] = await this.db.db
      .select({ phoneNumber: users.phoneNumber })
      .from(users)
      .where(eq(users.id, input.userId))
      .limit(1);
    if (!user?.phoneNumber) {
      this.metrics?.recordMessage(category, 'skipped_no_phone');
      return { status: 'SKIPPED_NO_PHONE', purpose };
    }
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
      if (!consent?.granted) {
        this.metrics?.recordMessage(category, 'skipped_no_consent');
        return { status: 'SKIPPED_NO_CONSENT', purpose };
      }
    }
    const startedAt = performance.now();
    try {
      const result = await this.provider.send({
        phoneNumber: user.phoneNumber,
        message: safeSmsMessage(input.notificationType),
        idempotencyKey: `${input.eventId}:SMS`,
        correlationId: input.eventId,
      });
      this.metrics?.recordMessage(category, 'accepted', (performance.now() - startedAt) / 1_000);
      return { status: 'SENT', purpose, providerMessageId: result.providerMessageId };
    } catch (error) {
      const outcome =
        error instanceof KavenegarProviderError
          ? error.providerStatus === 408
            ? 'timeout'
            : error.transient
              ? 'transient_failure'
              : 'permanent_failure'
          : 'transient_failure';
      this.metrics?.recordMessage(category, outcome, (performance.now() - startedAt) / 1_000);
      if (outcome === 'permanent_failure') this.metrics?.recordMessage(category, 'rejected');
      throw error;
    }
  }
}
