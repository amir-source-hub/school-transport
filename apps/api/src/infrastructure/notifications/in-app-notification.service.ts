import { Injectable } from '@nestjs/common';
import { and, asc, eq, lte, or } from 'drizzle-orm';
import { AppLogger } from '../../common/logger';
import { generateId } from '../../common/utils';
import { DatabaseService } from '../../database/database.service';
import type { DatabaseTransaction } from '../../database/payment-plan';
import { notificationOutbox, notifications } from '../../database/schemas';
import { KavenegarProviderError } from '../sms/kavenegar.client';
import { SmsNotificationService } from '../sms/sms-notification.service';
import { OperationalMetricsService } from '../metrics/operational-metrics.service';
import { Optional } from '@nestjs/common';
import { notificationPurpose } from './notification.catalog';

export type InAppNotification = {
  eventId?: string;
  userId: string;
  notificationType: string;
  title: string;
  message: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
};

const MAX_ATTEMPTS = 5;
const PROCESSING_LEASE_MS = 5 * 60 * 1_000;

@Injectable()
export class InAppNotificationService {
  constructor(
    private readonly db: DatabaseService,
    private readonly logger: AppLogger,
    private readonly sms: SmsNotificationService,
    @Optional() private readonly metrics?: OperationalMetricsService,
  ) {}

  async enqueueInTransaction(txn: DatabaseTransaction, data: InAppNotification): Promise<string> {
    const eventId = data.eventId ?? generateId();
    await txn
      .insert(notifications)
      .values({
        id: generateId(),
        eventId,
        userId: data.userId,
        notificationType: data.notificationType,
        channel: 'IN_APP',
        purpose: notificationPurpose(data.notificationType),
        title: data.title,
        message: data.message,
        relatedEntityType: data.relatedEntityType || null,
        relatedEntityId: data.relatedEntityId || null,
        notificationStatus: 'SENT',
        sentAt: new Date(),
      })
      .onConflictDoNothing({ target: notifications.eventId });
    await txn
      .insert(notificationOutbox)
      .values({
        id: generateId(),
        eventId,
        userId: data.userId,
        notificationType: data.notificationType,
        title: data.title,
        message: data.message,
        relatedEntityType: data.relatedEntityType || null,
        relatedEntityId: data.relatedEntityId || null,
      })
      .onConflictDoNothing({ target: notificationOutbox.eventId });
    return eventId;
  }

  async create(data: InAppNotification): Promise<void> {
    try {
      await this.db.db.transaction((txn) => this.enqueueInTransaction(txn, data));
    } catch {
      // Compatibility path for commands not yet transaction-aware. Notification persistence
      // must never make an already committed command appear to have failed.
      this.logger.error('Notification outbox enqueue failed after command commit.');
    }
  }

  async dispatchAvailable(limit = 20): Promise<number> {
    let delivered = 0;
    for (let index = 0; index < limit; index += 1) {
      const event = await this.claimNext();
      if (!event) {
        this.metrics?.setNotificationQueueAge(0);
        break;
      }
      this.metrics?.setNotificationQueueAge(
        (Date.now() - new Date(event.createdAt).getTime()) / 1_000,
      );
      try {
        await this.deliver(event);
        delivered += 1;
      } catch (error) {
        await this.recordFailure(
          event.id,
          event.eventId,
          event.notificationType,
          event.attemptCount,
          error,
        );
      }
    }
    return delivered;
  }

  private async claimNext() {
    return this.db.db.transaction(async (txn) => {
      const now = new Date();
      const staleLease = new Date(now.getTime() - PROCESSING_LEASE_MS);
      const [event] = await txn
        .select()
        .from(notificationOutbox)
        .where(
          and(
            lte(notificationOutbox.nextAttemptAt, now),
            or(
              eq(notificationOutbox.outboxStatus, 'PENDING'),
              eq(notificationOutbox.outboxStatus, 'RETRY'),
              and(
                eq(notificationOutbox.outboxStatus, 'PROCESSING'),
                lte(notificationOutbox.lockedAt, staleLease),
              ),
            ),
          ),
        )
        .orderBy(asc(notificationOutbox.createdAt), asc(notificationOutbox.id))
        .for('update', { skipLocked: true })
        .limit(1);
      if (!event) return null;
      const [claimed] = await txn
        .update(notificationOutbox)
        .set({
          outboxStatus: 'PROCESSING',
          attemptCount: event.attemptCount + 1,
          lockedAt: now,
          updatedAt: now,
        })
        .where(eq(notificationOutbox.id, event.id))
        .returning();
      return claimed;
    });
  }

  private async deliver(event: typeof notificationOutbox.$inferSelect): Promise<void> {
    // The in-app row is persisted with the business transaction. Keep this idempotent
    // compatibility insert for outbox records created before that behavior was introduced.
    await this.db.db.transaction(async (txn) => {
      await txn
        .insert(notifications)
        .values({
          id: generateId(),
          eventId: event.eventId,
          userId: event.userId,
          notificationType: event.notificationType,
          channel: 'IN_APP',
          title: event.title,
          message: event.message,
          relatedEntityType: event.relatedEntityType,
          relatedEntityId: event.relatedEntityId,
          notificationStatus: 'SENT',
          sentAt: new Date(),
        })
        .onConflictDoNothing({ target: notifications.eventId });
    });
    const sms = await this.sms.dispatch({
      eventId: event.eventId,
      userId: event.userId,
      notificationType: event.notificationType,
    });
    await this.db.db.transaction(async (txn) => {
      if (sms.status !== 'DISABLED') {
        await txn
          .insert(notifications)
          .values({
            id: generateId(),
            eventId: `${event.eventId}:SMS`,
            userId: event.userId,
            notificationType: event.notificationType,
            channel: 'SMS',
            purpose: sms.purpose,
            title: event.title,
            message: event.message,
            relatedEntityType: event.relatedEntityType,
            relatedEntityId: event.relatedEntityId,
            notificationStatus: sms.status === 'SENT' ? 'SENT' : sms.status,
            providerMessageId: sms.status === 'SENT' ? sms.providerMessageId : null,
            sentAt: sms.status === 'SENT' ? new Date() : null,
          })
          .onConflictDoNothing({ target: notifications.eventId });
      }
      await txn
        .update(notificationOutbox)
        .set({
          outboxStatus: 'DELIVERED',
          deliveredAt: new Date(),
          lockedAt: null,
          failureCode: null,
          updatedAt: new Date(),
        })
        .where(eq(notificationOutbox.id, event.id));
    });
  }

  private async recordFailure(
    id: string,
    eventId: string,
    notificationType: string,
    attemptCount: number,
    error: unknown,
  ): Promise<void> {
    const permanent = error instanceof KavenegarProviderError && !error.transient;
    const retry = permanent
      ? { status: 'DEAD' as const, delayMs: 0 }
      : notificationRetryDecision(attemptCount);
    await this.db.db
      .update(notificationOutbox)
      .set({
        outboxStatus: retry.status,
        nextAttemptAt: new Date(Date.now() + retry.delayMs),
        lockedAt: null,
        failureCode: permanent ? 'SMS_PROVIDER_REJECTED' : 'DELIVERY_FAILED',
        updatedAt: new Date(),
      })
      .where(eq(notificationOutbox.id, id));
    const category =
      notificationPurpose(notificationType) === 'OPTIONAL_UPDATES'
        ? 'optional_notification'
        : 'service_notification';
    if (retry.status === 'DEAD') this.metrics?.recordMessage(category, 'dead_letter');
    else this.metrics?.recordMessage(category, 'retry');
    if (retry.status === 'DEAD')
      this.logger.error(`Notification outbox event ${eventId} moved to dead-letter state.`);
    else this.logger.warn(`Notification outbox event ${eventId} scheduled for retry.`);
  }
}

export function notificationRetryDecision(attemptCount: number): {
  status: 'RETRY' | 'DEAD';
  delayMs: number;
} {
  return {
    status: attemptCount >= MAX_ATTEMPTS ? 'DEAD' : 'RETRY',
    delayMs: Math.min(60 * 60 * 1_000, 5_000 * 2 ** Math.max(0, attemptCount - 1)),
  };
}
