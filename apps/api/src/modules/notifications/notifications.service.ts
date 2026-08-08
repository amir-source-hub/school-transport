import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { notificationConsents, notifications } from '../../database/schemas';
import { eq, and, desc, inArray } from 'drizzle-orm';
import { InAppNotificationService } from '../../infrastructure/notifications/in-app-notification.service';
import { Inject } from '@nestjs/common';
import { AUDIT_PORT, AuditPort } from '../../common/audit.port';
import { UpdateNotificationConsentDto } from './notification-consent.dto';
import { NOTIFICATION_CONSENT_TEXT_VERSION } from '../../database/schemas/notifications.schema';

@Injectable()
export class NotificationsService {
  constructor(
    private readonly db: DatabaseService,
    private readonly outbox: InAppNotificationService,
    @Inject(AUDIT_PORT) private readonly audit: AuditPort,
  ) {}

  async getConsentSettings(userId: string) {
    const rows = await this.db.db
      .select()
      .from(notificationConsents)
      .where(eq(notificationConsents.userId, userId));
    const optional = (channel: 'IN_APP' | 'SMS') =>
      rows.find((row) => row.channel === channel && row.purpose === 'OPTIONAL_UPDATES')?.granted ??
      false;
    return {
      textVersion: NOTIFICATION_CONSENT_TEXT_VERSION,
      consentText:
        'مایلم پیام‌های اختیاری درباره تغییرات سرویس، یادآوری‌ها و اطلاع‌رسانی‌های غیرالزامی را از کانال‌های انتخاب‌شده دریافت کنم. لغو رضایت از تنظیمات حساب در هر زمان ممکن است.',
      serviceNotices: { inApp: true, sms: true, configurable: false },
      optionalUpdates: { inApp: optional('IN_APP'), sms: optional('SMS') },
    };
  }

  async updateConsent(
    userId: string,
    input: UpdateNotificationConsentDto,
    ipAddress?: string,
  ) {
    const now = new Date();
    return this.db.db.transaction(async (txn) => {
      const [previous] = await txn
        .select()
        .from(notificationConsents)
        .where(
          and(
            eq(notificationConsents.userId, userId),
            eq(notificationConsents.channel, input.channel),
            eq(notificationConsents.purpose, input.purpose),
          ),
        )
        .limit(1);
      const [saved] = await txn
        .insert(notificationConsents)
        .values({
          userId,
          channel: input.channel,
          purpose: input.purpose,
          granted: input.granted,
          textVersion: NOTIFICATION_CONSENT_TEXT_VERSION,
          source: input.source,
          grantedAt: input.granted ? now : null,
          revokedAt: input.granted ? null : now,
          updatedBy: userId,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: [
            notificationConsents.userId,
            notificationConsents.purpose,
            notificationConsents.channel,
          ],
          set: {
            granted: input.granted,
            textVersion: NOTIFICATION_CONSENT_TEXT_VERSION,
            source: input.source,
            grantedAt: input.granted ? now : null,
            revokedAt: input.granted ? null : now,
            updatedBy: userId,
            updatedAt: now,
          },
        })
        .returning();
      await this.audit.recordInTransaction(txn, {
        actorType: 'PARENT',
        actorId: userId,
        action: input.granted ? 'NOTIFICATION_CONSENT_GRANTED' : 'NOTIFICATION_CONSENT_REVOKED',
        entityType: 'NOTIFICATION_CONSENT',
        entityId: saved.id,
        previousValues: previous
          ? { channel: previous.channel, purpose: previous.purpose, granted: previous.granted }
          : undefined,
        newValues: { channel: saved.channel, purpose: saved.purpose, granted: saved.granted },
        ipAddress,
      });
      return saved;
    });
  }

  async getByUser(userId: string) {
    let items = await this.db.db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt));
    if (items.length === 0) {
      await this.outbox.create({
        eventId: `WELCOME:${userId}`,
        userId,
        notificationType: 'WELCOME',
        title: 'به پنل خانواده خوش آمدید',
        message:
          'از این بخش می‌توانید ثبت‌نام، تصمیم‌های مدیریت، قراردادها، پرداخت‌ها و سررسیدها را دنبال کنید.',
      });
      items = await this.db.db
        .select()
        .from(notifications)
        .where(eq(notifications.userId, userId))
        .orderBy(desc(notifications.createdAt));
    }
    return items;
  }

  async getAll() {
    return this.db.db
      .select()
      .from(notifications)
      .where(
        inArray(notifications.notificationType, [
          'ACCOUNT_REGISTERED',
          'ADMIN_STUDENT_ADDED',
          'ENROLLMENT_CREATED',
          'PAYMENT_SUCCEEDED',
          'PAYMENT_APPROVED',
          'PAYMENT_REJECTED',
          'PAYMENT_PLAN_READY',
          'CONTRACT_ACCEPTED',
          'CONTRACT_REJECTED',
        ]),
      )
      .orderBy(desc(notifications.createdAt));
  }

  async getUnreadCount(userId: string) {
    const result = await this.db.db
      .select()
      .from(notifications)
      .where(
        and(eq(notifications.userId, userId), eq(notifications.notificationStatus, 'PENDING')),
      );

    return { unreadCount: result.length };
  }

  async markRead(notificationId: string, userId: string) {
    await this.db.db
      .update(notifications)
      .set({ notificationStatus: 'SENT', sentAt: new Date() })
      .where(and(eq(notifications.id, notificationId), eq(notifications.userId, userId)));
  }

  async markAllRead(userId: string) {
    await this.db.db
      .update(notifications)
      .set({ notificationStatus: 'SENT', sentAt: new Date() })
      .where(
        and(eq(notifications.userId, userId), eq(notifications.notificationStatus, 'PENDING')),
      );
  }
}
