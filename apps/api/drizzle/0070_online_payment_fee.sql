ALTER TABLE "payment_transactions" ADD COLUMN "gateway_fee_amount" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_gateway_fee_nonnegative" CHECK ("gateway_fee_amount" >= 0);
