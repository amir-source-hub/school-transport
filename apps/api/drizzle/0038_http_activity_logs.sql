CREATE TABLE "http_activity_logs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "request_id" varchar(128) NOT NULL,
  "trace_id" varchar(32) NOT NULL,
  "actor_type" varchar(20),
  "actor_id" uuid,
  "method" varchar(10) NOT NULL,
  "route" varchar(255) NOT NULL,
  "status_code" integer NOT NULL,
  "duration_ms" integer NOT NULL,
  "outcome" varchar(20) NOT NULL,
  "error_code" varchar(100),
  "ip_address" varchar(50),
  "user_agent" varchar(500),
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX "idx_http_activity_request_id" ON "http_activity_logs" USING btree ("request_id");
CREATE INDEX "idx_http_activity_trace_id" ON "http_activity_logs" USING btree ("trace_id");
CREATE INDEX "idx_http_activity_actor_created" ON "http_activity_logs" USING btree ("actor_id", "created_at");
CREATE INDEX "idx_http_activity_route_created" ON "http_activity_logs" USING btree ("route", "created_at");
CREATE INDEX "idx_http_activity_outcome_created" ON "http_activity_logs" USING btree ("outcome", "created_at");
CREATE INDEX "idx_http_activity_created_at" ON "http_activity_logs" USING btree ("created_at");
