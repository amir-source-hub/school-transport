ALTER TABLE "payment_transactions" DROP CONSTRAINT IF EXISTS "payment_transactions_idempotency_key_unique";
DROP INDEX IF EXISTS "idx_transactions_idempotency";
ALTER TABLE "payment_transactions" ADD COLUMN IF NOT EXISTS "idempotency_fingerprint" varchar(64);
CREATE UNIQUE INDEX IF NOT EXISTS "idx_transactions_user_operation_idempotency"
  ON "payment_transactions" USING btree ("user_id", "payment_method", "idempotency_key");
