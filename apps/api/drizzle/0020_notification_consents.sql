CREATE TABLE IF NOT EXISTS "notification_consents" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id"),
  "channel" varchar(20) NOT NULL,
  "purpose" varchar(30) NOT NULL,
  "granted" boolean DEFAULT false NOT NULL,
  "text_version" varchar(40) NOT NULL,
  "source" varchar(30) NOT NULL,
  "granted_at" timestamp with time zone,
  "revoked_at" timestamp with time zone,
  "updated_by" uuid NOT NULL REFERENCES "users"("id"),
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "notification_consents_channel_check" CHECK ("channel" IN ('IN_APP', 'SMS')),
  CONSTRAINT "notification_consents_purpose_check" CHECK ("purpose" IN ('SERVICE', 'OPTIONAL_UPDATES')),
  CONSTRAINT "notification_consents_timestamp_check" CHECK (
    ("granted" = true AND "granted_at" IS NOT NULL AND "revoked_at" IS NULL)
    OR ("granted" = false AND "revoked_at" IS NOT NULL)
  )
);
CREATE UNIQUE INDEX IF NOT EXISTS "idx_notification_consents_user_purpose_channel"
  ON "notification_consents" ("user_id", "purpose", "channel");
CREATE INDEX IF NOT EXISTS "idx_notification_consents_user" ON "notification_consents" ("user_id");
