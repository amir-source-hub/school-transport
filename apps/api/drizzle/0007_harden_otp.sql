ALTER TABLE "otp_requests" ADD COLUMN IF NOT EXISTS "invalidated_at" timestamp with time zone;
ALTER TABLE "otp_requests" ADD COLUMN IF NOT EXISTS "request_ip" varchar(64);
CREATE INDEX IF NOT EXISTS "idx_otp_request_ip_created" ON "otp_requests" USING btree ("request_ip", "created_at");
