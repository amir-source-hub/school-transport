import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { notifications } from '../../database/schemas';
import { eq, and, desc, inArray } from 'drizzle-orm';
import { generateId } from '../../common/utils';

@Injectable()
export class NotificationsService {
  constructor(private readonly db: DatabaseService) {}

  async getByUser(userId: string) {
    let items = await this.db.db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt));
    if (items.length === 0) {
      await this.create({
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
          'ENROLLMENT_CREATED',
          'PAYMENT_SUCCEEDED',
          'OFFLINE_PAYMENT_SUBMITTED',
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

  async create(data: {
    userId: string;
    notificationType: string;
    title: string;
    message: string;
    relatedEntityType?: string;
    relatedEntityId?: string;
  }) {
    await this.db.db.insert(notifications).values({
      id: generateId(),
      userId: data.userId,
      notificationType: data.notificationType,
      channel: 'IN_APP',
      title: data.title,
      message: data.message,
      relatedEntityType: data.relatedEntityType || null,
      relatedEntityId: data.relatedEntityId || null,
    });
  }
}
