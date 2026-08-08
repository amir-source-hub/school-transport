ALTER TABLE "contracts" ADD COLUMN "accepted_by_admin_id" uuid;--> statement-breakpoint
ALTER TABLE "contracts" ADD COLUMN "signer_role" varchar(30) DEFAULT 'PARENT' NOT NULL;--> statement-breakpoint
ALTER TABLE "contracts" ADD COLUMN "signer_reason" varchar(500);--> statement-breakpoint
ALTER TABLE "contracts" ADD COLUMN "signer_source" varchar(30);--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "contracts" ADD CONSTRAINT "contracts_accepted_by_admin_id_admin_users_id_fk" FOREIGN KEY ("accepted_by_admin_id") REFERENCES "public"."admin_users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
