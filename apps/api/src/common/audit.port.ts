export const AUDIT_PORT = Symbol('AUDIT_PORT');

export type AuditRecord = {
  actorType: string;
  actorId: string;
  action: string;
  entityType: string;
  entityId?: string;
  previousValues?: unknown;
  newValues?: unknown;
  ipAddress?: string;
  correlationId?: string;
};

export interface AuditPort {
  record(data: AuditRecord): Promise<void>;
  recordInTransaction(transaction: unknown, data: AuditRecord): Promise<void>;
}
