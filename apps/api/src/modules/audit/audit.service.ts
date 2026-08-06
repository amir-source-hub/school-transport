import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { auditLogs } from '../../database/schemas';
import { eq, and } from 'drizzle-orm';
import { generateId } from '../../common/utils';
import { serializeSafeAuditValues } from '../../common/sensitive-data';
import { AuditPort, AuditRecord } from '../../common/audit.port';
import { RequestContext } from '../../common/request-context';

const ALLOWED_VALUE_FIELDS = new Set([
  'registrationStatus',
  'contractStatus',
  'priceStatus',
  'planStatus',
  'transactionStatus',
  'paymentMethod',
  'planType',
  'totalAmount',
  'prepaymentAmount',
  'remainingInstallmentAmount',
  'installmentCount',
  'itemStatus',
  'studentId',
  'registrationId',
  'priceId',
  'planId',
  'contractId',
  'scheduleItemId',
  'status',
  'isActive',
]);

@Injectable()
export class AuditService implements AuditPort {
  constructor(
    private readonly db: DatabaseService,
    private readonly requestContext: RequestContext,
  ) {}

  async record(data: AuditRecord) {
    await this.recordInTransaction(this.db.db, data);
  }

  async recordInTransaction(
    transaction: unknown,
    data: AuditRecord,
  ) {
    const writer = transaction as Pick<DatabaseService['db'], 'insert'>;
    await writer.insert(auditLogs).values({
      id: generateId(),
      actorType: data.actorType,
      actorId: data.actorId,
      action: data.action,
      entityType: data.entityType,
      entityId: data.entityId || null,
      previousValues: serializeSafeAuditValues(allowlistedAuditValues(data.previousValues)),
      newValues: serializeSafeAuditValues(allowlistedAuditValues(data.newValues)),
      ipAddress: data.ipAddress || null,
      correlationId: data.correlationId || this.requestContext.requestId || null,
    });
  }

  async getByEntity(entityType: string, entityId: string) {
    return this.db.db
      .select({
        id: auditLogs.id,
        actorType: auditLogs.actorType,
        actorId: auditLogs.actorId,
        action: auditLogs.action,
        entityType: auditLogs.entityType,
        entityId: auditLogs.entityId,
        previousValues: auditLogs.previousValues,
        newValues: auditLogs.newValues,
        correlationId: auditLogs.correlationId,
        createdAt: auditLogs.createdAt,
      })
      .from(auditLogs)
      .where(and(eq(auditLogs.entityType, entityType), eq(auditLogs.entityId, entityId)));
  }
}

export function allowlistedAuditValues(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  return Object.fromEntries(
    Object.entries(value).filter(([key]) => ALLOWED_VALUE_FIELDS.has(key)),
  );
}
