import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { auditLogs } from '../../database/schemas';
import { eq, and } from 'drizzle-orm';
import { generateId } from '../../common/utils';

@Injectable()
export class AuditService {
  constructor(private readonly db: DatabaseService) {}

  async record(data: {
    actorType: string;
    actorId: string;
    action: string;
    entityType: string;
    entityId?: string;
    previousValues?: string;
    newValues?: string;
    ipAddress?: string;
  }) {
    await this.db.db.insert(auditLogs).values({
      id: generateId(),
      actorType: data.actorType,
      actorId: data.actorId,
      action: data.action,
      entityType: data.entityType,
      entityId: data.entityId || null,
      previousValues: data.previousValues || null,
      newValues: data.newValues || null,
      ipAddress: data.ipAddress || null,
    });
  }

  async getByEntity(entityType: string, entityId: string) {
    return this.db.db.select()
      .from(auditLogs)
      .where(and(eq(auditLogs.entityType, entityType), eq(auditLogs.entityId, entityId)));
  }
}
