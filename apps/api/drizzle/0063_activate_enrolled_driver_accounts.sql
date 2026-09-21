-- Repair driver enrollments that committed their driver and vehicle records before the
-- separate onboarding-finalize request could activate the account. A driver row is only
-- created after the complete form, contract acceptance, photos, and vehicle data validate.
UPDATE "users" AS u
SET
  "username" = d."phone_number",
  "account_status" = 'ACTIVE',
  "updated_at" = now()
FROM "drivers" AS d
WHERE u."account_type" = 'DRIVER'
  AND u."account_status" IN ('PENDING', 'EXPIRED')
  AND d."user_id" = u."id"
  AND d."status" = 'ACTIVE'
  AND EXISTS (
    SELECT 1
    FROM "vehicles" AS v
    WHERE v."driver_id" = d."id"
  );

UPDATE "onboarding_sessions" AS os
SET
  "status" = 'COMPLETED',
  "current_step" = 'DONE',
  "completed_at" = COALESCE(os."completed_at", now()),
  "updated_at" = now()
WHERE os."portal_role" = 'DRIVER'
  AND os."status" = 'PENDING'
  AND EXISTS (
    SELECT 1
    FROM "users" AS u
    INNER JOIN "drivers" AS d ON d."user_id" = u."id"
    INNER JOIN "vehicles" AS v ON v."driver_id" = d."id"
    WHERE u."id" = os."user_id"
      AND u."account_type" = 'DRIVER'
      AND u."account_status" = 'ACTIVE'
      AND d."status" = 'ACTIVE'
  );
