ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "event_id" varchar(255);
CREATE UNIQUE INDEX IF NOT EXISTS "idx_notifications_event" ON "notifications" ("event_id");

CREATE TABLE IF NOT EXISTS "notification_outbox" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "event_id" varchar(255) NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id"),
  "notification_type" varchar(50) NOT NULL,
  "title" varchar(200) NOT NULL,
  "message" text NOT NULL,
  "related_entity_type" varchar(50),
  "related_entity_id" uuid,
  "outbox_status" varchar(20) DEFAULT 'PENDING' NOT NULL,
  "attempt_count" integer DEFAULT 0 NOT NULL,
  "next_attempt_at" timestamptz DEFAULT now() NOT NULL,
  "locked_at" timestamptz,
  "delivered_at" timestamptz,
  "failure_code" varchar(80),
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "idx_notification_outbox_event" ON "notification_outbox" ("event_id");
CREATE INDEX IF NOT EXISTS "idx_notification_outbox_dispatch" ON "notification_outbox" ("outbox_status", "next_attempt_at");
