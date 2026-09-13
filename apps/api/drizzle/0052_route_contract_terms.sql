ALTER TABLE "transport_service_runs" ADD COLUMN IF NOT EXISTS "contract_price_rials" integer;
ALTER TABLE "transport_service_runs" ADD COLUMN IF NOT EXISTS "contract_date" varchar(10);
ALTER TABLE "transport_service_runs" ADD CONSTRAINT "transport_runs_contract_price_nonnegative" CHECK ("contract_price_rials" IS NULL OR "contract_price_rials" >= 0);
ALTER TABLE "transport_service_runs" DROP CONSTRAINT IF EXISTS "transport_runs_direction_check";
ALTER TABLE "transport_service_runs" ADD CONSTRAINT "transport_runs_direction_check" CHECK ("direction" IN ('TO_SCHOOL', 'FROM_SCHOOL', 'ROUND_TRIP'));
