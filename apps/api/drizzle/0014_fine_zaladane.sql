CREATE TABLE IF NOT EXISTS "onboarding_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"phone_number" varchar(20) NOT NULL,
	"user_id" uuid NOT NULL,
	"status" varchar(20) DEFAULT 'PENDING' NOT NULL,
	"onboarding_token_hash" varchar(64) NOT NULL,
	"verified_at" timestamp with time zone NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"current_step" varchar(50),
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DROP INDEX IF EXISTS "idx_auth_sessions_token_hash";--> statement-breakpoint
DROP INDEX IF EXISTS "idx_auth_sessions_subject_role";--> statement-breakpoint
DROP INDEX IF EXISTS "idx_auth_sessions_expires_at";--> statement-breakpoint
DROP INDEX IF EXISTS "idx_auth_sessions_revoked_at";--> statement-breakpoint
ALTER TABLE "auth_sessions" ALTER COLUMN "ip_address" SET DATA TYPE varchar(45);--> statement-breakpoint
ALTER TABLE "auth_sessions" ALTER COLUMN "revocation_reason" SET DATA TYPE varchar(30);--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "onboarding_sessions" ADD CONSTRAINT "onboarding_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_onboarding_one_active_per_phone" ON "onboarding_sessions" USING btree ("phone_number") WHERE "onboarding_sessions"."status" = 'PENDING';--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_onboarding_phone_status" ON "onboarding_sessions" USING btree ("phone_number","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_onboarding_expires_at" ON "onboarding_sessions" USING btree ("expires_at");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "auth_sessions" ADD CONSTRAINT "auth_sessions_subject_id_users_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_sessions_refresh_token_hash" ON "auth_sessions" USING btree ("refresh_token_hash");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_sessions_subject_role" ON "auth_sessions" USING btree ("subject_id","role");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_sessions_expires_at" ON "auth_sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_sessions_revoked_at" ON "auth_sessions" USING btree ("revoked_at");--> statement-breakpoint
ALTER TABLE "auth_sessions" ADD CONSTRAINT "auth_sessions_refresh_token_hash_unique" UNIQUE("refresh_token_hash");