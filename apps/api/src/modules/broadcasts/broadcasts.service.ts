import { Inject, Injectable, Optional } from '@nestjs/common';
import { and, asc, count, eq, inArray, lte, sql } from 'drizzle-orm';
import { AUDIT_PORT, type AuditPort } from '../../common/audit.port';
import { AppError, ConflictError, NotFoundError } from '../../common/errors';
import { generateId } from '../../common/utils';
import { ConfigService } from '../../config/config.service';
import { DatabaseService } from '../../database/database.service';
import {
  notificationConsents,
  notifications,
  smsBroadcastRecipients,
  smsBroadcasts,
  users,
} from '../../database/schemas';
import { KavenegarProviderError } from '../../infrastructure/sms/kavenegar.client';
import { SMS_PROVIDER, type SmsProvider } from '../../infrastructure/sms/sms-provider.port';
import type { CreateBroadcastDto } from './broadcast.dto';
import { smsSegmentCount } from './sms-segments';
import { OperationalMetricsService } from '../../infrastructure/metrics/operational-metrics.service';

const MAX_ATTEMPTS = 5;

@Injectable()
export class BroadcastsService {
  constructor(
    private readonly db: DatabaseService,
    private readonly config: ConfigService,
    @Inject(SMS_PROVIDER) private readonly sms: SmsProvider,
    @Inject(AUDIT_PORT) private readonly audit: AuditPort,
    @Optional() private readonly metrics?: OperationalMetricsService,
  ) {}

  async list() {
    const campaigns = await this.db.db
      .select()
      .from(smsBroadcasts)
      .orderBy(asc(smsBroadcasts.createdAt));
    const counts = await this.db.db
      .select({
        broadcastId: smsBroadcastRecipients.broadcastId,
        status: smsBroadcastRecipients.status,
        value: count(),
      })
      .from(smsBroadcastRecipients)
      .groupBy(smsBroadcastRecipients.broadcastId, smsBroadcastRecipients.status);
    return campaigns.map((campaign) => ({
      ...campaign,
      deliveryCounts: Object.fromEntries(
        counts
          .filter((row) => row.broadcastId === campaign.id)
          .map((row) => [row.status, Number(row.value)]),
      ),
    }));
  }

  async preview(input: CreateBroadcastDto, adminId?: string, ipAddress?: string) {
    this.assertFeatureAvailable();
    const scheduledAt = new Date(input.scheduledAt);
    const expiresAt = new Date(input.expiresAt);
    if (expiresAt <= scheduledAt || expiresAt <= new Date()) {
      throw new AppError('INVALID_BROADCAST_WINDOW', 'زمان انقضا باید پس از زمان ارسال باشد.', 400);
    }
    const segmentCount = smsSegmentCount(input.smsContent.trim());
    if (segmentCount > this.config.smsBroadcastMaxSegments) {
      throw new AppError('SMS_SEGMENT_LIMIT', 'تعداد قطعه‌های پیامک بیش از حد مجاز است.', 400);
    }
    const recipients = await this.eligibleAudience();
    if (recipients.length > this.config.smsBroadcastMaxRecipients) {
      throw new AppError('BROADCAST_RECIPIENT_LIMIT', 'تعداد گیرندگان بیش از سقف مجاز است.', 400);
    }
    const estimatedCostRial =
      recipients.length * segmentCount * this.config.smsBroadcastPricePerSegmentRial;
    if (
      this.config.smsBroadcastMaxCostRial > 0 &&
      estimatedCostRial > this.config.smsBroadcastMaxCostRial
    ) {
      throw new AppError('BROADCAST_COST_LIMIT', 'هزینه برآوردی از سقف مجاز بیشتر است.', 400);
    }
    const estimate = {
      segmentCount,
      estimatedRecipients: recipients.length,
      estimatedCostRial,
    };
    if (adminId)
      await this.audit.record({
        actorType: 'ADMIN',
        actorId: adminId,
        action: 'SMS_BROADCAST_PREVIEWED',
        entityType: 'SMS_BROADCAST',
        newValues: { status: 'PREVIEWED' },
        ipAddress,
      });
    return estimate;
  }

  async create(input: CreateBroadcastDto, adminId: string, ipAddress?: string) {
    const estimate = await this.preview(input);
    const [campaign] = await this.db.db
      .insert(smsBroadcasts)
      .values({
        id: generateId(),
        name: input.name.trim(),
        smsContent: input.smsContent.trim(),
        inAppTitle: input.inAppTitle?.trim() || null,
        inAppContent: input.inAppContent?.trim() || null,
        audience: { accountStatus: 'ACTIVE' },
        status: 'PENDING_APPROVAL',
        featureEnabled: input.featureEnabled,
        creatorId: adminId,
        scheduledAt: new Date(input.scheduledAt),
        expiresAt: new Date(input.expiresAt),
        ...estimate,
      })
      .returning();
    await this.audit.record({
      actorType: 'ADMIN',
      actorId: adminId,
      action: 'SMS_BROADCAST_SUBMITTED',
      entityType: 'SMS_BROADCAST',
      entityId: campaign.id,
      newValues: { status: campaign.status },
      ipAddress,
    });
    return campaign;
  }

  async approve(id: string, adminId: string, ipAddress?: string) {
    this.assertFeatureAvailable();
    return this.db.db.transaction(async (txn) => {
      const [campaign] = await txn
        .select()
        .from(smsBroadcasts)
        .where(eq(smsBroadcasts.id, id))
        .for('update')
        .limit(1);
      if (!campaign) throw new NotFoundError('Broadcast', id);
      if (campaign.status !== 'PENDING_APPROVAL')
        throw new ConflictError('INVALID_BROADCAST_STATE', 'این پیام در انتظار تأیید نیست.');
      if (campaign.creatorId === adminId)
        throw new AppError('DUAL_APPROVAL_REQUIRED', 'سازنده پیام نمی‌تواند آن را تأیید کند.', 403);
      if (!campaign.featureEnabled)
        throw new ConflictError(
          'BROADCAST_DISABLED',
          'فعال‌سازی این پیام پیش از تأیید الزامی است.',
        );
      const recipients = await this.eligibleAudience(txn);
      if (recipients.length > this.config.smsBroadcastMaxRecipients)
        throw new AppError('BROADCAST_RECIPIENT_LIMIT', 'تعداد گیرندگان بیش از سقف مجاز است.', 400);
      const estimatedCostRial =
        recipients.length * campaign.segmentCount * this.config.smsBroadcastPricePerSegmentRial;
      if (
        this.config.smsBroadcastMaxCostRial > 0 &&
        estimatedCostRial > this.config.smsBroadcastMaxCostRial
      )
        throw new AppError('BROADCAST_COST_LIMIT', 'هزینه برآوردی از سقف مجاز بیشتر است.', 400);
      if (recipients.length)
        await txn.insert(smsBroadcastRecipients).values(
          recipients.map((recipient) => ({
            id: generateId(),
            broadcastId: id,
            userId: recipient.id,
            normalizedPhone: recipient.phoneNumber,
          })),
        );
      const now = new Date();
      const [approved] = await txn
        .update(smsBroadcasts)
        .set({
          status: 'SCHEDULED',
          approverId: adminId,
          approvedAt: now,
          estimatedRecipients: recipients.length,
          estimatedCostRial,
          approvedSnapshot: {
            name: campaign.name,
            smsContent: campaign.smsContent,
            inAppTitle: campaign.inAppTitle,
            inAppContent: campaign.inAppContent,
            audience: campaign.audience,
            scheduledAt: campaign.scheduledAt.toISOString(),
            expiresAt: campaign.expiresAt.toISOString(),
            segmentCount: campaign.segmentCount,
          },
          updatedAt: now,
        })
        .where(eq(smsBroadcasts.id, id))
        .returning();
      await this.audit.recordInTransaction(txn, {
        actorType: 'ADMIN',
        actorId: adminId,
        action: 'SMS_BROADCAST_APPROVED',
        entityType: 'SMS_BROADCAST',
        entityId: id,
        newValues: { status: 'SCHEDULED' },
        ipAddress,
      });
      this.metrics?.addBroadcastEstimatedSpend(estimatedCostRial);
      return approved;
    });
  }

  async testSend(id: string, phoneNumber: string, adminId: string, ipAddress?: string) {
    this.assertFeatureAvailable();
    if (!this.config.smsBroadcastTestNumbers.includes(phoneNumber))
      throw new AppError(
        'TEST_NUMBER_NOT_ALLOWED',
        'این شماره در فهرست شماره‌های آزمایشی مجاز نیست.',
        403,
      );
    const campaign = await this.get(id);
    const startedAt = performance.now();
    let result;
    try {
      result = await this.sms.send({
        phoneNumber,
        message: campaign.smsContent,
        idempotencyKey: `broadcast-test:${id}:${generateId()}`,
        correlationId: id,
      });
      this.metrics?.recordMessage(
        'test_broadcast',
        'accepted',
        (performance.now() - startedAt) / 1_000,
      );
    } catch (error) {
      this.recordProviderFailure('test_broadcast', error, startedAt);
      throw error;
    }
    await this.audit.record({
      actorType: 'ADMIN',
      actorId: adminId,
      action: 'SMS_BROADCAST_TEST_SENT',
      entityType: 'SMS_BROADCAST',
      entityId: id,
      ipAddress,
    });
    return { accepted: true, providerMessageId: result.providerMessageId };
  }

  async cancel(id: string, adminId: string, ipAddress?: string) {
    return this.changeState(
      id,
      ['PENDING_APPROVAL', 'SCHEDULED', 'PAUSED'],
      'CANCELLED',
      adminId,
      'SMS_BROADCAST_CANCELLED',
      ipAddress,
    );
  }

  async pause(id: string, adminId: string, ipAddress?: string) {
    return this.changeState(
      id,
      ['SCHEDULED', 'PROCESSING'],
      'PAUSED',
      adminId,
      'SMS_BROADCAST_PAUSED',
      ipAddress,
    );
  }

  async resume(id: string, adminId: string, ipAddress?: string) {
    return this.changeState(
      id,
      ['PAUSED'],
      'SCHEDULED',
      adminId,
      'SMS_BROADCAST_RESUMED',
      ipAddress,
    );
  }

  async dispatchAvailable(): Promise<number> {
    if (!this.config.featureSmsBroadcasts || this.config.smsProvider === 'none') return 0;
    const now = new Date();
    const campaigns = await this.db.db
      .select()
      .from(smsBroadcasts)
      .where(
        and(
          inArray(smsBroadcasts.status, ['SCHEDULED', 'PROCESSING']),
          lte(smsBroadcasts.scheduledAt, now),
        ),
      );
    let handled = 0;
    for (const campaign of campaigns) {
      if (campaign.expiresAt <= now) {
        await this.expire(campaign.id);
        continue;
      }
      await this.db.db
        .update(smsBroadcasts)
        .set({ status: 'PROCESSING', updatedAt: now })
        .where(and(eq(smsBroadcasts.id, campaign.id), eq(smsBroadcasts.status, 'SCHEDULED')));
      for (let index = 0; index < this.config.smsBroadcastBatchSize; index += 1) {
        const recipient = await this.claimRecipient(campaign.id);
        if (!recipient) break;
        await this.deliver(campaign, recipient);
        handled += 1;
      }
      const [{ remaining }] = await this.db.db
        .select({ remaining: count() })
        .from(smsBroadcastRecipients)
        .where(
          and(
            eq(smsBroadcastRecipients.broadcastId, campaign.id),
            inArray(smsBroadcastRecipients.status, ['QUEUED', 'RETRY', 'PROCESSING']),
          ),
        );
      if (Number(remaining) === 0)
        await this.db.db
          .update(smsBroadcasts)
          .set({ status: 'COMPLETED', completedAt: new Date(), updatedAt: new Date() })
          .where(eq(smsBroadcasts.id, campaign.id));
    }
    return handled;
  }

  private async eligibleAudience(writer: DatabaseService['db'] = this.db.db) {
    const rows = await writer
      .select({ id: users.id, phoneNumber: users.phoneNumber })
      .from(users)
      .innerJoin(
        notificationConsents,
        and(
          eq(notificationConsents.userId, users.id),
          eq(notificationConsents.channel, 'SMS'),
          eq(notificationConsents.purpose, 'OPTIONAL_UPDATES'),
          eq(notificationConsents.granted, true),
        ),
      )
      .where(and(eq(users.accountStatus, 'ACTIVE'), sql`${users.phoneNumber} IS NOT NULL`));
    const unique = new Map<string, { id: string; phoneNumber: string }>();
    for (const row of rows)
      if (row.phoneNumber && /^09\d{9}$/.test(row.phoneNumber) && !unique.has(row.phoneNumber))
        unique.set(row.phoneNumber, { id: row.id, phoneNumber: row.phoneNumber });
    return [...unique.values()];
  }

  private async claimRecipient(broadcastId: string) {
    return this.db.db.transaction(async (txn) => {
      const [recipient] = await txn
        .select()
        .from(smsBroadcastRecipients)
        .where(
          and(
            eq(smsBroadcastRecipients.broadcastId, broadcastId),
            inArray(smsBroadcastRecipients.status, ['QUEUED', 'RETRY']),
            lte(smsBroadcastRecipients.nextAttemptAt, new Date()),
          ),
        )
        .for('update', { skipLocked: true })
        .limit(1);
      if (!recipient) return null;
      const [claimed] = await txn
        .update(smsBroadcastRecipients)
        .set({
          status: 'PROCESSING',
          attemptCount: recipient.attemptCount + 1,
          updatedAt: new Date(),
        })
        .where(eq(smsBroadcastRecipients.id, recipient.id))
        .returning();
      return claimed;
    });
  }

  private async deliver(
    campaign: typeof smsBroadcasts.$inferSelect,
    recipient: typeof smsBroadcastRecipients.$inferSelect,
  ) {
    if (campaign.inAppTitle && campaign.inAppContent) {
      const [inAppEligible] = await this.db.db
        .select({ id: notificationConsents.id })
        .from(notificationConsents)
        .where(
          and(
            eq(notificationConsents.userId, recipient.userId),
            eq(notificationConsents.channel, 'IN_APP'),
            eq(notificationConsents.purpose, 'OPTIONAL_UPDATES'),
            eq(notificationConsents.granted, true),
          ),
        )
        .limit(1);
      if (inAppEligible) {
        await this.db.db
          .insert(notifications)
          .values({
            id: generateId(),
            eventId: `broadcast:${campaign.id}:${recipient.userId}:IN_APP`,
            userId: recipient.userId,
            notificationType: 'ADMIN_BROADCAST',
            channel: 'IN_APP',
            purpose: 'OPTIONAL_UPDATES',
            title: campaign.inAppTitle,
            message: campaign.inAppContent,
          })
          .onConflictDoNothing({ target: notifications.eventId });
      }
    }
    const [eligible] = await this.db.db
      .select({ id: users.id })
      .from(users)
      .innerJoin(
        notificationConsents,
        and(
          eq(notificationConsents.userId, users.id),
          eq(notificationConsents.channel, 'SMS'),
          eq(notificationConsents.purpose, 'OPTIONAL_UPDATES'),
          eq(notificationConsents.granted, true),
        ),
      )
      .where(
        and(
          eq(users.id, recipient.userId),
          eq(users.accountStatus, 'ACTIVE'),
          eq(users.phoneNumber, recipient.normalizedPhone),
        ),
      )
      .limit(1);
    if (!eligible) {
      this.metrics?.recordMessage('broadcast_campaign', 'skipped_no_consent');
      await this.finishRecipient(recipient.id, 'SKIPPED_NO_CONSENT');
      return;
    }
    const startedAt = performance.now();
    try {
      const result = await this.sms.send({
        phoneNumber: recipient.normalizedPhone,
        message: campaign.smsContent,
        idempotencyKey: `broadcast:${campaign.id}:${recipient.userId}`,
        correlationId: campaign.id,
      });
      await this.db.db
        .update(smsBroadcastRecipients)
        .set({
          status: 'ACCEPTED',
          providerMessageId: result.providerMessageId,
          sentAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(smsBroadcastRecipients.id, recipient.id));
      this.metrics?.recordMessage(
        'broadcast_campaign',
        'accepted',
        (performance.now() - startedAt) / 1_000,
      );
    } catch (error) {
      const permanent = error instanceof KavenegarProviderError && !error.transient;
      const dead = permanent || recipient.attemptCount >= MAX_ATTEMPTS;
      await this.db.db
        .update(smsBroadcastRecipients)
        .set({
          status: dead ? 'FAILED' : 'RETRY',
          failureCode: permanent ? 'PROVIDER_REJECTED' : 'DELIVERY_FAILED',
          nextAttemptAt: new Date(
            Date.now() + Math.min(3_600_000, 5_000 * 2 ** Math.max(0, recipient.attemptCount - 1)),
          ),
          updatedAt: new Date(),
        })
        .where(eq(smsBroadcastRecipients.id, recipient.id));
      this.recordProviderFailure('broadcast_campaign', error, startedAt);
      this.metrics?.recordMessage('broadcast_campaign', dead ? 'dead_letter' : 'retry');
    }
  }

  private recordProviderFailure(
    category: 'test_broadcast' | 'broadcast_campaign',
    error: unknown,
    startedAt: number,
  ) {
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
  }

  private async finishRecipient(id: string, status: string) {
    await this.db.db
      .update(smsBroadcastRecipients)
      .set({ status, updatedAt: new Date() })
      .where(eq(smsBroadcastRecipients.id, id));
  }
  private async expire(id: string) {
    await this.db.db.transaction(async (txn) => {
      await txn
        .update(smsBroadcasts)
        .set({ status: 'EXPIRED', updatedAt: new Date() })
        .where(eq(smsBroadcasts.id, id));
      await txn
        .update(smsBroadcastRecipients)
        .set({ status: 'CANCELLED', updatedAt: new Date() })
        .where(
          and(
            eq(smsBroadcastRecipients.broadcastId, id),
            inArray(smsBroadcastRecipients.status, ['QUEUED', 'RETRY']),
          ),
        );
    });
  }
  private async get(id: string) {
    const [value] = await this.db.db
      .select()
      .from(smsBroadcasts)
      .where(eq(smsBroadcasts.id, id))
      .limit(1);
    if (!value) throw new NotFoundError('Broadcast', id);
    return value;
  }
  private assertFeatureAvailable() {
    if (!this.config.featureSmsBroadcasts || this.config.smsProvider === 'none')
      throw new AppError('SMS_BROADCASTS_DISABLED', 'ارسال گروهی پیامک غیرفعال است.', 503);
  }
  private async changeState(
    id: string,
    allowed: string[],
    status: string,
    adminId: string,
    action: string,
    ipAddress?: string,
  ) {
    const [value] = await this.db.db
      .update(smsBroadcasts)
      .set({
        status,
        cancelledAt: status === 'CANCELLED' ? new Date() : undefined,
        updatedAt: new Date(),
      })
      .where(and(eq(smsBroadcasts.id, id), inArray(smsBroadcasts.status, allowed)))
      .returning();
    if (!value) throw new ConflictError('INVALID_BROADCAST_STATE', 'تغییر وضعیت پیام ممکن نیست.');
    if (status === 'CANCELLED')
      await this.db.db
        .update(smsBroadcastRecipients)
        .set({ status: 'CANCELLED', updatedAt: new Date() })
        .where(
          and(
            eq(smsBroadcastRecipients.broadcastId, id),
            inArray(smsBroadcastRecipients.status, ['QUEUED', 'RETRY']),
          ),
        );
    await this.audit.record({
      actorType: 'ADMIN',
      actorId: adminId,
      action,
      entityType: 'SMS_BROADCAST',
      entityId: id,
      newValues: { status },
      ipAddress,
    });
    return value;
  }
}
