import { Inject, Injectable } from '@nestjs/common';
import { and, count, desc, eq, sql } from 'drizzle-orm';
import { AUDIT_PORT, type AuditPort } from '../../common/audit.port';
import { ConflictError, NotFoundError } from '../../common/errors';
import { generateId } from '../../common/utils';
import { DatabaseService } from '../../database/database.service';
import { adminUsers, feedbackSubmissions, students } from '../../database/schemas';
import { InAppNotificationService } from '../../infrastructure/notifications/in-app-notification.service';
import type { CreateFeedbackDto, FeedbackQueryDto } from './feedback.dto';

@Injectable()
export class FeedbackService {
  constructor(
    private readonly db: DatabaseService,
    private readonly notifications: InAppNotificationService,
    @Inject(AUDIT_PORT) private readonly audit: AuditPort,
  ) {}
  async create(userId: string, input: CreateFeedbackDto) {
    if (input.studentId) {
      const [owned] = await this.db.db
        .select({ id: students.id })
        .from(students)
        .where(and(eq(students.id, input.studentId), eq(students.userId, userId)))
        .limit(1);
      if (!owned) throw new NotFoundError('Student');
    }
    const [saved] = await this.db.db
      .insert(feedbackSubmissions)
      .values({
        id: generateId(),
        userId,
        studentId: input.studentId ?? null,
        category: input.category,
        subject: input.subject.trim(),
        message: input.message.trim(),
        status: input.category === 'SAFETY' ? 'ESCALATED' : 'NEW',
        priority: input.category === 'SAFETY' ? 'URGENT' : 'NORMAL',
      })
      .returning();
    return saved;
  }
  async listMine(userId: string, query: FeedbackQueryDto) {
    const where = eq(feedbackSubmissions.userId, userId);
    const items = await this.db.db
      .select()
      .from(feedbackSubmissions)
      .where(where)
      .orderBy(desc(feedbackSubmissions.createdAt), desc(feedbackSubmissions.id))
      .limit(query.pageSize)
      .offset((query.page - 1) * query.pageSize);
    const [{ value }] = await this.db.db
      .select({ value: count() })
      .from(feedbackSubmissions)
      .where(where);
    return { items, total: Number(value) };
  }
  async listAdmin(query: FeedbackQueryDto, adminId: string, ip?: string) {
    const filters = [];
    if (query.status) filters.push(eq(feedbackSubmissions.status, query.status));
    if (query.category) filters.push(eq(feedbackSubmissions.category, query.category));
    const where = filters.length ? and(...filters) : sql`true`;
    const items = await this.db.db
      .select()
      .from(feedbackSubmissions)
      .where(where)
      .orderBy(desc(feedbackSubmissions.createdAt), desc(feedbackSubmissions.id))
      .limit(query.pageSize)
      .offset((query.page - 1) * query.pageSize);
    const [{ value }] = await this.db.db
      .select({ value: count() })
      .from(feedbackSubmissions)
      .where(where);
    await this.audit.record({
      actorType: 'ADMIN',
      actorId: adminId,
      action: 'FEEDBACK_QUEUE_READ',
      entityType: 'FEEDBACK',
      ipAddress: ip,
    });
    return { items, total: Number(value) };
  }
  async markRead(id: string, adminId: string, version: number, ip?: string) {
    return this.transition(
      id,
      version,
      { status: 'READ', readAt: new Date() },
      adminId,
      'FEEDBACK_READ',
      ip,
    );
  }
  async assign(id: string, adminId: string, assigneeId: string, version: number, ip?: string) {
    const [active] = await this.db.db
      .select({ id: adminUsers.id })
      .from(adminUsers)
      .where(and(eq(adminUsers.id, assigneeId), eq(adminUsers.status, 'ACTIVE')))
      .limit(1);
    if (!active) throw new NotFoundError('Admin');
    return this.transition(id, version, { assigneeId }, adminId, 'FEEDBACK_ASSIGNED', ip);
  }
  async respond(id: string, adminId: string, response: string, version: number, ip?: string) {
    const item = await this.db.db.transaction(async (txn) => {
      const [updated] = await txn
        .update(feedbackSubmissions)
        .set({
          response: response.trim(),
          responderId: adminId,
          respondedAt: new Date(),
          status: 'ANSWERED',
          version: version + 1,
          updatedAt: new Date(),
        })
        .where(and(eq(feedbackSubmissions.id, id), eq(feedbackSubmissions.version, version)))
        .returning();
      if (!updated) throw new ConflictError('FEEDBACK_CHANGED', 'این پیام هم‌زمان تغییر کرده است.');
      await this.notifications.enqueueInTransaction(txn, {
        eventId: `FEEDBACK_RESPONSE:${id}`,
        userId: updated.userId,
        notificationType: 'FEEDBACK_RESPONSE',
        title: 'پاسخ جدید به پیام شما',
        message: 'پاسخ مدیریت ثبت شد. برای مشاهده جزئیات وارد پنل امن شوید.',
        relatedEntityType: 'FEEDBACK',
        relatedEntityId: id,
      });
      await this.audit.recordInTransaction(txn, {
        actorType: 'ADMIN',
        actorId: adminId,
        action: 'FEEDBACK_RESPONDED',
        entityType: 'FEEDBACK',
        entityId: id,
        newValues: { status: 'ANSWERED' },
        ipAddress: ip,
      });
      return updated;
    });
    return item;
  }
  async close(id: string, adminId: string, version: number, ip?: string) {
    return this.transition(
      id,
      version,
      { status: 'CLOSED', closedAt: new Date() },
      adminId,
      'FEEDBACK_CLOSED',
      ip,
    );
  }
  private async transition(
    id: string,
    version: number,
    set: Record<string, unknown>,
    adminId: string,
    action: string,
    ip?: string,
  ) {
    const [value] = await this.db.db
      .update(feedbackSubmissions)
      .set({ ...set, version: version + 1, updatedAt: new Date() })
      .where(and(eq(feedbackSubmissions.id, id), eq(feedbackSubmissions.version, version)))
      .returning();
    if (!value) throw new ConflictError('FEEDBACK_CHANGED', 'این پیام هم‌زمان تغییر کرده است.');
    await this.audit.record({
      actorType: 'ADMIN',
      actorId: adminId,
      action,
      entityType: 'FEEDBACK',
      entityId: id,
      newValues: { status: value.status },
      ipAddress: ip,
    });
    return value;
  }
}
