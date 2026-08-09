CREATE TABLE IF NOT EXISTS "student_photo_uploads" (
  "id" uuid PRIMARY KEY NOT NULL,
  "account_user_id" uuid NOT NULL,
  "student_id" uuid,
  "version" integer NOT NULL DEFAULT 1,
  "raw_key" varchar(255) NOT NULL,
  "canonical_key" varchar(255),
  "declared_mime" varchar(60) NOT NULL,
  "declared_size" integer NOT NULL,
  "actual_mime" varchar(60),
  "actual_size" integer,
  "width" integer,
  "height" integer,
  "checksum" varchar(64),
  "status" varchar(30) NOT NULL DEFAULT 'AUTHORIZED',
  "rejection_code" varchar(60),
  "rejection_detail" text,
  "reviewer_admin_id" uuid,
  "reviewed_at" timestamp with time zone,
  "upload_authorization_expiry" timestamp with time zone NOT NULL,
  "authorized_at" timestamp with time zone DEFAULT now() NOT NULL,
  "uploaded_at" timestamp with time zone,
  "validating_at" timestamp with time zone,
  "pending_review_at" timestamp with time zone,
  "approved_at" timestamp with time zone,
  "rejected_at" timestamp with time zone,
  "superseded_at" timestamp with time zone,
  "failed_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "student_photo_uploads"
    ADD CONSTRAINT "student_photo_uploads_account_user_id_users_id_fk"
    FOREIGN KEY ("account_user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "student_photo_uploads"
    ADD CONSTRAINT "student_photo_uploads_student_id_students_id_fk"
    FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "student_photo_uploads"
    ADD CONSTRAINT "student_photo_uploads_reviewer_admin_id_admin_users_id_fk"
    FOREIGN KEY ("reviewer_admin_id") REFERENCES "admin_users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

--> statement-breakpoint
-- Exactly one active approved canonical image per student (NULL studentId rows
-- are account-scoped placeholders awaiting enrollment linkage).
CREATE UNIQUE INDEX IF NOT EXISTS "idx_student_photos_one_approved"
  ON "student_photo_uploads" ("student_id") WHERE "status" = 'APPROVED';

--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_student_photos_account"
  ON "student_photo_uploads" ("account_user_id", "created_at");

--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_student_photos_student"
  ON "student_photo_uploads" ("student_id", "status");

--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_student_photos_review_queue"
  ON "student_photo_uploads" ("status", "created_at");

--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_student_photos_cleanup"
  ON "student_photo_uploads" ("status", "updated_at");
