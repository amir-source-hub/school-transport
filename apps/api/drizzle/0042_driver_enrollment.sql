ALTER TABLE "drivers" ADD COLUMN IF NOT EXISTS "user_id" uuid;
ALTER TABLE "drivers" ADD COLUMN IF NOT EXISTS "secondary_phone_number" varchar(20);
ALTER TABLE "drivers" ADD COLUMN IF NOT EXISTS "home_phone_number" varchar(20);
ALTER TABLE "drivers" ADD COLUMN IF NOT EXISTS "emergency_phone_number" varchar(20);
ALTER TABLE "drivers" ADD COLUMN IF NOT EXISTS "street_address" text;
ALTER TABLE "drivers" ADD COLUMN IF NOT EXISTS "postal_code" varchar(10);
ALTER TABLE "drivers" ADD COLUMN IF NOT EXISTS "province" varchar(100);
ALTER TABLE "drivers" ADD COLUMN IF NOT EXISTS "city" varchar(100);
ALTER TABLE "drivers" ADD COLUMN IF NOT EXISTS "municipality_district" varchar(50);
ALTER TABLE "drivers" ADD COLUMN IF NOT EXISTS "referrer_name" varchar(200);
ALTER TABLE "drivers" ADD COLUMN IF NOT EXISTS "referrer_phone_number" varchar(20);
ALTER TABLE "drivers" ADD COLUMN IF NOT EXISTS "contract_version" varchar(30);
ALTER TABLE "drivers" ADD COLUMN IF NOT EXISTS "contract_accepted_at" timestamp with time zone;
CREATE UNIQUE INDEX IF NOT EXISTS "idx_drivers_user_unique" ON "drivers" ("user_id");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_drivers_phone_unique" ON "drivers" ("phone_number");

ALTER TABLE "vehicles" ADD COLUMN IF NOT EXISTS "usage_type" varchar(20);
ALTER TABLE "vehicles" ADD COLUMN IF NOT EXISTS "ownership_type" varchar(20);

CREATE TABLE IF NOT EXISTS "driver_document_uploads" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "document_type" varchar(30) NOT NULL,
  "object_key" varchar(500) NOT NULL UNIQUE,
  "mime_type" varchar(100) NOT NULL,
  "declared_size" integer NOT NULL,
  "status" varchar(20) DEFAULT 'AUTHORIZED' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "idx_driver_document_uploads_owner" ON "driver_document_uploads" ("user_id", "status");

-- Existing operational rows predate self-service enrollment. Production rollout must backfill
-- these columns before applying NOT NULL in a follow-up migration.
