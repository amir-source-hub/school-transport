CREATE TABLE IF NOT EXISTS "offline_payment_destinations" (
  "id" uuid PRIMARY KEY NOT NULL,
  "version" integer NOT NULL,
  "account_owner" varchar(150) NOT NULL,
  "bank_name" varchar(100) NOT NULL,
  "card_number" varchar(16) NOT NULL,
  "iban" varchar(26),
  "account_number" varchar(40),
  "instructions" text NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_by_admin_id" uuid NOT NULL REFERENCES "admin_users"("id"),
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "offline_destinations_card_digits" CHECK ("card_number" ~ '^[0-9]{16}$')
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_offline_destinations_version" ON "offline_payment_destinations" ("version");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_offline_destinations_one_active" ON "offline_payment_destinations" ("is_active") WHERE "is_active" = true;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "offline_payment_submissions" (
  "id" uuid PRIMARY KEY NOT NULL,
  "payment_schedule_item_id" uuid NOT NULL REFERENCES "payment_schedule_items"("id"),
  "payment_plan_id" uuid NOT NULL REFERENCES "payment_plans"("id"),
  "payer_user_id" uuid NOT NULL REFERENCES "users"("id"),
  "destination_id" uuid NOT NULL REFERENCES "offline_payment_destinations"("id"),
  "destination_snapshot" jsonb NOT NULL,
  "submitted_amount" integer NOT NULL,
  "paid_at" timestamp with time zone NOT NULL,
  "payer_name" varchar(150),
  "source_card_last_four" varchar(4),
  "reference_number" varchar(100) NOT NULL,
  "note" text,
  "receipt_object_key" varchar(255),
  "receipt_mime" varchar(60),
  "receipt_size" integer,
  "receipt_width" integer,
  "receipt_height" integer,
  "receipt_checksum" varchar(64),
  "status" varchar(30) DEFAULT 'PENDING_REVIEW' NOT NULL,
  "version" integer DEFAULT 1 NOT NULL,
  "idempotency_key" varchar(128) NOT NULL,
  "reviewer_admin_id" uuid REFERENCES "admin_users"("id"),
  "reviewed_at" timestamp with time zone,
  "rejection_reason" text,
  "transaction_id" uuid REFERENCES "payment_transactions"("id"),
  "submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "offline_submissions_amount_positive" CHECK ("submitted_amount" > 0),
  CONSTRAINT "offline_submissions_last_four" CHECK ("source_card_last_four" IS NULL OR "source_card_last_four" ~ '^[0-9]{4}$'),
  CONSTRAINT "offline_submissions_valid_status" CHECK ("status" IN ('DRAFT', 'PENDING_REVIEW', 'APPROVED', 'REJECTED', 'WITHDRAWN', 'SUPERSEDED')),
  CONSTRAINT "offline_submissions_receipt_required" CHECK ("status" = 'DRAFT' OR ("receipt_object_key" IS NOT NULL AND "receipt_checksum" IS NOT NULL))
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_offline_submissions_owner" ON "offline_payment_submissions" ("payer_user_id", "created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_offline_submissions_review" ON "offline_payment_submissions" ("status", "created_at");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_offline_submissions_idempotency" ON "offline_payment_submissions" ("payer_user_id", "idempotency_key");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_offline_submissions_one_active" ON "offline_payment_submissions" ("payment_schedule_item_id") WHERE "status" IN ('DRAFT', 'PENDING_REVIEW');
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_offline_submissions_one_approved" ON "offline_payment_submissions" ("payment_schedule_item_id") WHERE "status" = 'APPROVED';
