ALTER TABLE "transport_service_run_students"
ADD COLUMN IF NOT EXISTS "scheduled_stop_time" time;

CREATE INDEX IF NOT EXISTS "idx_transport_run_students_run_active"
ON "transport_service_run_students" ("service_run_id", "is_active");
