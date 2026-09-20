-- 0037 created an unnamed CHECK, which PostgreSQL named
-- transport_service_runs_direction_check. 0052 dropped a different name,
-- leaving the old two-direction restriction active beside the new check.
ALTER TABLE "transport_service_runs"
  DROP CONSTRAINT IF EXISTS "transport_service_runs_direction_check";
