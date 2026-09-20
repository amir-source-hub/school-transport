-- Route prices are stored in rials. Even a valid 13-digit toman entry exceeds int4.
ALTER TABLE "transport_service_runs"
  ALTER COLUMN "contract_price_rials" TYPE bigint;
