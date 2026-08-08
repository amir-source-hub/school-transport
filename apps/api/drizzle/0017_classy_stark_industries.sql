CREATE TABLE IF NOT EXISTS "student_limit_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"current_limit" integer NOT NULL,
	"requested_limit" integer NOT NULL,
	"reason" varchar(500) NOT NULL,
	"status" varchar(20) DEFAULT 'PENDING' NOT NULL,
	"reviewed_by_admin_id" uuid,
	"reviewed_at" timestamp with time zone,
	"rejection_reason" varchar(500),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "student_limit" integer DEFAULT 2 NOT NULL;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "student_limit_requests" ADD CONSTRAINT "student_limit_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "student_limit_requests" ADD CONSTRAINT "student_limit_requests_reviewed_by_admin_id_admin_users_id_fk" FOREIGN KEY ("reviewed_by_admin_id") REFERENCES "public"."admin_users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_limit_requests_one_pending" ON "student_limit_requests" USING btree ("user_id") WHERE "student_limit_requests"."status" = 'PENDING';--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_limit_requests_user" ON "student_limit_requests" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_limit_requests_status" ON "student_limit_requests" USING btree ("status");