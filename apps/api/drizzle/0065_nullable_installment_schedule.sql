ALTER TABLE "payment_plans" DROP CONSTRAINT IF EXISTS "payment_plans_installment_structure";
--> statement-breakpoint
ALTER TABLE "payment_plans" ADD CONSTRAINT "payment_plans_installment_structure" CHECK (("plan_type" = 'FULL' AND "installment_count" BETWEEN 0 AND 1) OR ("plan_type" IN ('PREPAYMENT_PLUS_FOUR_INSTALLMENTS', 'ADMIN_CONFIGURED') AND "installment_count" BETWEEN 0 AND 12));
