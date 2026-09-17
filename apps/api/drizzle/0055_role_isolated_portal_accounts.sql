ALTER TABLE "users" ADD COLUMN "account_type" varchar(20) NOT NULL DEFAULT 'PARENT';
ALTER TABLE "onboarding_sessions" ADD COLUMN "portal_role" varchar(20) NOT NULL DEFAULT 'PARENT';

ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "users_username_unique";
ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "users_phone_number_unique";
DROP INDEX IF EXISTS "idx_users_username";
DROP INDEX IF EXISTS "idx_users_phone";
DROP INDEX IF EXISTS "idx_onboarding_one_active_per_phone";
DROP INDEX IF EXISTS "idx_onboarding_phone_status";

CREATE TEMP TABLE "driver_user_split" (
  "old_user_id" uuid PRIMARY KEY,
  "new_user_id" uuid NOT NULL
) ON COMMIT DROP;

INSERT INTO "driver_user_split" ("old_user_id", "new_user_id")
SELECT DISTINCT d."user_id", gen_random_uuid()
FROM "drivers" d
WHERE EXISTS (SELECT 1 FROM "parents" p WHERE p."user_id" = d."user_id")
   OR EXISTS (SELECT 1 FROM "students" s WHERE s."user_id" = d."user_id");

INSERT INTO "users" (
  "id", "username", "phone_number", "account_type", "account_status",
  "student_limit", "last_login_at", "created_at", "updated_at"
)
SELECT
  split."new_user_id", u."username", u."phone_number", 'DRIVER', u."account_status",
  u."student_limit", u."last_login_at", u."created_at", u."updated_at"
FROM "driver_user_split" split
JOIN "users" u ON u."id" = split."old_user_id";

UPDATE "drivers" d
SET "user_id" = split."new_user_id"
FROM "driver_user_split" split
WHERE d."user_id" = split."old_user_id";

UPDATE "driver_document_uploads" upload
SET "user_id" = split."new_user_id"
FROM "driver_user_split" split
WHERE upload."user_id" = split."old_user_id";

UPDATE "auth_sessions" session
SET "subject_id" = split."new_user_id"
FROM "driver_user_split" split
WHERE session."subject_id" = split."old_user_id"
  AND session."role" = 'DRIVER';

UPDATE "users" u
SET "account_type" = 'DRIVER'
WHERE EXISTS (SELECT 1 FROM "drivers" d WHERE d."user_id" = u."id");

UPDATE "onboarding_sessions" session
SET "portal_role" = 'DRIVER'
WHERE EXISTS (SELECT 1 FROM "drivers" d WHERE d."user_id" = session."user_id")
  AND NOT EXISTS (SELECT 1 FROM "parents" p WHERE p."user_id" = session."user_id")
  AND NOT EXISTS (SELECT 1 FROM "students" s WHERE s."user_id" = session."user_id");

ALTER TABLE "users" ADD CONSTRAINT "users_account_type_check"
  CHECK ("account_type" IN ('PARENT', 'DRIVER'));
ALTER TABLE "onboarding_sessions" ADD CONSTRAINT "onboarding_portal_role_check"
  CHECK ("portal_role" IN ('PARENT', 'DRIVER'));

CREATE UNIQUE INDEX "idx_users_type_username" ON "users" ("account_type", "username");
CREATE UNIQUE INDEX "idx_users_type_phone" ON "users" ("account_type", "phone_number");
CREATE UNIQUE INDEX "idx_onboarding_one_active_per_phone_role"
  ON "onboarding_sessions" ("phone_number", "portal_role")
  WHERE "status" = 'PENDING';
CREATE INDEX "idx_onboarding_phone_role_status"
  ON "onboarding_sessions" ("phone_number", "portal_role", "status");
