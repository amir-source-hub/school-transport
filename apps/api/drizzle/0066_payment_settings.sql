CREATE TABLE IF NOT EXISTS "payment_settings" (
  "id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
  "default_prepayment_amount" integer NOT NULL,
  "version" integer DEFAULT 1 NOT NULL,
  "updated_by_admin_id" uuid REFERENCES "admin_users"("id"),
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "payment_settings_singleton" CHECK ("id" = 1),
  CONSTRAINT "payment_settings_amount_positive" CHECK ("default_prepayment_amount" > 0)
);
--> statement-breakpoint
INSERT INTO "payment_settings" ("id", "default_prepayment_amount")
VALUES (1, 49978000)
ON CONFLICT ("id") DO NOTHING;
--> statement-breakpoint
UPDATE "payment_plans" pp
SET "plan_status" = 'COMPLETED', "completed_at" = COALESCE(pp."completed_at", now()), "updated_at" = now()
WHERE pp."plan_type" = 'FULL' AND pp."total_amount" = pp."prepayment_amount"
  AND pp."plan_status" = 'ACTIVE'
  AND EXISTS (
    SELECT 1 FROM "payment_schedule_items" psi
    WHERE psi."payment_plan_id" = pp."id" AND psi."item_type" = 'PREPAYMENT'
      AND psi."item_status" = 'PAID' AND psi."amount" = pp."total_amount"
  )
  AND NOT EXISTS (
    SELECT 1 FROM "payment_schedule_items" psi
    WHERE psi."payment_plan_id" = pp."id" AND psi."item_type" = 'INSTALLMENT'
  );
