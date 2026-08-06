ALTER TABLE "audit_logs" ADD COLUMN IF NOT EXISTS "correlation_id" varchar(100);
CREATE INDEX IF NOT EXISTS "idx_audit_correlation" ON "audit_logs" ("correlation_id");

DROP TRIGGER IF EXISTS audit_logs_append_only ON audit_logs;
CREATE TRIGGER audit_logs_append_only
BEFORE UPDATE OR DELETE ON audit_logs
FOR EACH ROW EXECUTE FUNCTION reject_audit_mutation();
