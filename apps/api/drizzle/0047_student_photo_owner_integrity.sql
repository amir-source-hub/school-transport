CREATE UNIQUE INDEX IF NOT EXISTS "idx_students_id_user_unique"
  ON "students" ("id", "user_id");

--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "student_photo_uploads"
    ADD CONSTRAINT "student_photo_uploads_student_owner_fk"
    FOREIGN KEY ("student_id", "account_user_id")
    REFERENCES "students" ("id", "user_id")
    ON DELETE no action ON UPDATE no action
    NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
