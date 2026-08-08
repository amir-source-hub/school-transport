CREATE TABLE "sms_broadcasts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" varchar(120) NOT NULL,
  "sms_content" text NOT NULL,
  "in_app_title" varchar(200),
  "in_app_content" text,
  "audience" jsonb NOT NULL,
  "approved_snapshot" jsonb,
  "status" varchar(30) DEFAULT 'DRAFT' NOT NULL,
  "feature_enabled" boolean DEFAULT false NOT NULL,
  "segment_count" integer NOT NULL,
  "estimated_recipients" integer DEFAULT 0 NOT NULL,
  "estimated_cost_rial" integer DEFAULT 0 NOT NULL,
  "creator_id" uuid NOT NULL REFERENCES "admin_users"("id"),
  "approver_id" uuid REFERENCES "admin_users"("id"),
  "scheduled_at" timestamp with time zone NOT NULL,
  "expires_at" timestamp with time zone NOT NULL,
  "approved_at" timestamp with time zone,
  "cancelled_at" timestamp with time zone,
  "completed_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX "idx_sms_broadcasts_status_schedule" ON "sms_broadcasts" ("status", "scheduled_at");
CREATE INDEX "idx_sms_broadcasts_creator" ON "sms_broadcasts" ("creator_id");

CREATE TABLE "sms_broadcast_recipients" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "broadcast_id" uuid NOT NULL REFERENCES "sms_broadcasts"("id"),
  "user_id" uuid NOT NULL REFERENCES "users"("id"),
  "normalized_phone" varchar(20) NOT NULL,
  "status" varchar(30) DEFAULT 'QUEUED' NOT NULL,
  "provider_message_id" varchar(100),
  "attempt_count" integer DEFAULT 0 NOT NULL,
  "next_attempt_at" timestamp with time zone DEFAULT now() NOT NULL,
  "sent_at" timestamp with time zone,
  "failure_code" varchar(80),
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX "idx_sms_broadcast_recipient_user" ON "sms_broadcast_recipients" ("broadcast_id", "user_id");
CREATE UNIQUE INDEX "idx_sms_broadcast_recipient_phone" ON "sms_broadcast_recipients" ("broadcast_id", "normalized_phone");
CREATE INDEX "idx_sms_broadcast_recipient_dispatch" ON "sms_broadcast_recipients" ("broadcast_id", "status", "next_attempt_at");
