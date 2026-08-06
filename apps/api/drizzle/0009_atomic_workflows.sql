CREATE UNIQUE INDEX IF NOT EXISTS "idx_prices_one_accepted_per_registration"
  ON "registration_prices" ("registration_id")
  WHERE "price_status" = 'ACCEPTED';

DROP INDEX IF EXISTS "idx_plans_price";
CREATE UNIQUE INDEX IF NOT EXISTS "idx_plans_price_unique"
  ON "payment_plans" ("registration_price_id");

CREATE UNIQUE INDEX IF NOT EXISTS "idx_transactions_one_pending_offline_per_item"
  ON "payment_transactions" ("payment_schedule_item_id")
  WHERE "payment_method" = 'MANUAL_ADMIN_ENTRY' AND "transaction_status" = 'CREATED';

CREATE UNIQUE INDEX IF NOT EXISTS "idx_registrations_one_active_student_year"
  ON "service_registrations" ("student_id", "academic_year")
  WHERE "registration_status" NOT IN ('REJECTED', 'CANCELLED');
