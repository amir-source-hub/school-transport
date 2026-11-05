CREATE UNIQUE INDEX IF NOT EXISTS "idx_transactions_one_active_online_per_item"
ON "payment_transactions" ("payment_schedule_item_id")
WHERE "payment_method" = 'ONLINE_GATEWAY' AND "transaction_status" IN ('CREATED', 'REQUESTING', 'PENDING');
