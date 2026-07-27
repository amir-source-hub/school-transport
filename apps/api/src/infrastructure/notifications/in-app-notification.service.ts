import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { notifications } from '../../database/schemas';
import { generateId } from '../../common/utils';

export type InAppNotification = {
  userId: string;
  notificationType: string;
  title: string;
  message: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
};

@Injectable()
export class InAppNotificationService {
  constructor(private readonly db: DatabaseService) {}

  async create(data: InAppNotification): Promise<void> {
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
