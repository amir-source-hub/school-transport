import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { notificationConsents, notifications } from '../../database/schemas';
import { and, count, desc, eq, inArray, lt, or, sql } from 'drizzle-orm';
import { Inject } from '@nestjs/common';
import { AUDIT_PORT, AuditPort } from '../../common/audit.port';
import { UpdateNotificationConsentDto } from './notification-consent.dto';
import { NOTIFICATION_CONSENT_TEXT_VERSION } from '../../database/schemas/notifications.schema';
import {
  adminOperationalRoute,
  notificationCatalog,
  notificationRoute,
  type NotificationContext,
  type NotificationType,
} from '../../infrastructure/notifications/notification.catalog';

export interface NotificationListQuery {
  page?: number;
  pageSize?: number;
}

export interface AdminNotificationListQuery extends NotificationListQuery {
  cursor?: string;
  snapshotAt?: string;
  type?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
}

interface AdminNotificationCursor {
  createdAt: string;
  id: string;
}

function encodeAdminCursor(value: AdminNotificationCursor): string {
  return Buffer.from(JSON.stringify(value), 'utf8').toString('base64url');
}

function decodeAdminCursor(value: string): AdminNotificationCursor {
  try {
    const decoded = JSON.parse(
      Buffer.from(value, 'base64url').toString('utf8'),
    ) as Partial<AdminNotificationCursor>;
    if (
      typeof decoded.createdAt !== 'string' ||
      Number.isNaN(Date.parse(decoded.createdAt)) ||
      typeof decoded.id !== 'string' ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(decoded.id)
    ) {
      throw new Error('Malformed cursor payload.');
    }
    return { createdAt: decoded.createdAt, id: decoded.id };
  } catch {
    throw new BadRequestException('Invalid notification cursor.');
  }
}

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;
export const ADMIN_OPERATIONAL_HISTORY_DAYS = 30;

function boundedPagination(query: NotificationListQuery): { page: number; pageSize: number } {
  const page = Math.max(DEFAULT_PAGE, query.page ?? DEFAULT_PAGE);
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, query.pageSize ?? DEFAULT_PAGE_SIZE));
  return { page, pageSize };
}

function toNotificationView(row: typeof notifications.$inferSelect) {
  const context: NotificationContext = {
    relatedEntityType: row.relatedEntityType,
    relatedEntityId: row.relatedEntityId,
    userId: row.userId,
  };
  return {
    id: row.id,
    eventId: row.eventId,
    notificationType: row.notificationType,
    channel: row.channel,
    purpose: row.purpose,
    title: row.title,
    message: row.message,
    relatedEntityType: row.relatedEntityType,
    relatedEntityId: row.relatedEntityId,
    notificationStatus: row.notificationStatus,
    readAt: row.readAt,
    sentAt: row.sentAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    route: notificationRoute(row.notificationType, context),
  };
}

@Injectable()
export class NotificationsService {
  constructor(
    private readonly db: DatabaseService,
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

  async updateConsent(userId: string, input: UpdateNotificationConsentDto, ipAddress?: string) {
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

  async getByUser(userId: string, query: NotificationListQuery = {}) {
    const { page, pageSize } = boundedPagination(query);
    const where = and(eq(notifications.userId, userId), eq(notifications.channel, 'IN_APP'));
    const items = await this.db.db
      .select()
      .from(notifications)
      .where(where)
      .orderBy(desc(notifications.createdAt), desc(notifications.id))
      .limit(pageSize)
      .offset((page - 1) * pageSize);
    const [{ value }] = await this.db.db
      .select({ value: count() })
      .from(notifications)
      .where(where);
    return {
      items: items.map(toNotificationView),
      total: Number(value),
      page,
      pageSize,
    };
  }

  async getSharedAdminEvents(query: AdminNotificationListQuery = {}) {
    const { pageSize } = boundedPagination(query);
    const snapshotAt = query.snapshotAt ? new Date(query.snapshotAt) : new Date();
    const adminTypes = Object.entries(notificationCatalog)
      .filter(([, entry]) => entry.adminOperational)
      .map(([type]) => type as NotificationType);
    const filters = [
      eq(notifications.channel, 'IN_APP'),
      inArray(notifications.notificationType, adminTypes),
      sql`${notifications.createdAt} <= ${snapshotAt}`,
    ];
    if (query.type) filters.push(eq(notifications.notificationType, query.type));
    if (query.status) filters.push(eq(notifications.notificationStatus, query.status));
    const dateFrom = query.dateFrom
      ? new Date(query.dateFrom)
      : new Date(Date.now() - ADMIN_OPERATIONAL_HISTORY_DAYS * 24 * 60 * 60 * 1_000);
    filters.push(sql`${notifications.createdAt} >= ${dateFrom}`);
    if (query.dateTo) {
      const dateTo = new Date(query.dateTo);
      if (/^\d{4}-\d{2}-\d{2}$/.test(query.dateTo)) dateTo.setUTCHours(23, 59, 59, 999);
      filters.push(sql`${notifications.createdAt} <= ${dateTo}`);
    }
    const countWhere = and(...filters);
    if (query.cursor) {
      const cursor = decodeAdminCursor(query.cursor);
      const cursorTime = new Date(cursor.createdAt);
      filters.push(
        or(
          lt(notifications.createdAt, cursorTime),
          and(eq(notifications.createdAt, cursorTime), lt(notifications.id, cursor.id)),
        )!,
      );
    }
    const where = and(...filters);
    const items = await this.db.db
      .select()
      .from(notifications)
      .where(where)
      .orderBy(desc(notifications.createdAt), desc(notifications.id))
      .limit(pageSize + 1);
    const [{ value }] = await this.db.db
      .select({ value: count() })
      .from(notifications)
      .where(countWhere);
    const pageItems = items.slice(0, pageSize);
    const last = pageItems.at(-1);
    return {
      items: pageItems.map((row) => {
        const context: NotificationContext = {
          relatedEntityType: row.relatedEntityType,
          relatedEntityId: row.relatedEntityId,
          userId: row.userId,
        };
        return {
          id: row.id,
          eventId: row.eventId,
          notificationType: row.notificationType,
          title: row.title,
          message: row.message,
          notificationStatus: row.notificationStatus,
          eventTime: row.createdAt,
          route: adminOperationalRoute(row.notificationType, context),
        };
      }),
      total: Number(value),
      pageSize,
      snapshotAt: snapshotAt.toISOString(),
      nextCursor:
        items.length > pageSize && last
          ? encodeAdminCursor({ createdAt: last.createdAt.toISOString(), id: last.id })
          : null,
    };
  }

  async getUnreadCount(userId: string) {
    const result = await this.db.db
      .select()
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, userId),
          eq(notifications.channel, 'IN_APP'),
          sql`${notifications.readAt} is null`,
        ),
      );
    return { unreadCount: result.length };
  }

  async markRead(notificationId: string, userId: string) {
    const [updated] = await this.db.db
      .update(notifications)
      .set({ readAt: new Date(), updatedAt: new Date() })
      .where(
        and(
          eq(notifications.id, notificationId),
          eq(notifications.userId, userId),
          eq(notifications.channel, 'IN_APP'),
        ),
      )
      .returning();
    if (!updated) throw new NotFoundException('Notification not found.');
    return updated;
  }

  async markAllRead(userId: string) {
    await this.db.db
      .update(notifications)
      .set({ readAt: new Date(), updatedAt: new Date() })
      .where(
        and(
          eq(notifications.userId, userId),
          eq(notifications.channel, 'IN_APP'),
          sql`${notifications.readAt} is null`,
        ),
      );
  }
}
