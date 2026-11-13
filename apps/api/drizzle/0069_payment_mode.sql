ALTER TABLE "payment_settings" ADD COLUMN IF NOT EXISTS "payment_mode" varchar(10) DEFAULT 'ONLINE' NOT NULL;
--> statement-breakpoint
ALTER TABLE "payment_settings" ADD CONSTRAINT "payment_settings_mode_valid" CHECK ("payment_mode" IN ('ONLINE', 'OFFLINE'));
