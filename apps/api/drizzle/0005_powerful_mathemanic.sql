ALTER TABLE "payment_plans" ALTER COLUMN "plan_type" SET DATA TYPE varchar(50);--> statement-breakpoint
ALTER TABLE "registration_prices" ALTER COLUMN "set_by_admin_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "family_addresses" ADD COLUMN "latitude" double precision;--> statement-breakpoint
ALTER TABLE "family_addresses" ADD COLUMN "longitude" double precision;
--> statement-breakpoint
ALTER TABLE "registration_prices" DROP CONSTRAINT IF EXISTS "registration_prices_installment_count";
--> statement-breakpoint
ALTER TABLE "registration_prices" ADD CONSTRAINT "registration_prices_installment_count" CHECK (NOT "installment_payment_allowed" OR "installment_count" BETWEEN 1 AND 12);
--> statement-breakpoint
ALTER TABLE "payment_plans" DROP CONSTRAINT IF EXISTS "payment_plans_installment_structure";
--> statement-breakpoint
ALTER TABLE "payment_plans" ADD CONSTRAINT "payment_plans_installment_structure" CHECK (("plan_type" = 'FULL' AND "installment_count" = 1) OR ("plan_type" IN ('PREPAYMENT_PLUS_FOUR_INSTALLMENTS', 'ADMIN_CONFIGURED') AND "installment_count" BETWEEN 1 AND 12));
--> statement-breakpoint
ALTER TABLE "payment_schedule_items" DROP CONSTRAINT IF EXISTS "payment_schedule_valid_sequence";
--> statement-breakpoint
ALTER TABLE "payment_schedule_items" ADD CONSTRAINT "payment_schedule_valid_sequence" CHECK (("item_type" = 'PREPAYMENT' AND "sequence_number" = 0) OR ("item_type" = 'INSTALLMENT' AND "sequence_number" BETWEEN 1 AND 12));
