-- HTTP request history is security evidence. Keep it append-only like domain audit history.
DROP TRIGGER IF EXISTS http_activity_logs_append_only ON http_activity_logs;
--> statement-breakpoint
CREATE TRIGGER http_activity_logs_append_only
BEFORE UPDATE OR DELETE ON http_activity_logs
FOR EACH ROW EXECUTE FUNCTION reject_audit_mutation();
