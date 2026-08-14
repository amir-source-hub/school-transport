ALTER TABLE "feedback_submissions" ALTER COLUMN "user_id" DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE "feedback_submissions" ADD COLUMN "sender_type" varchar(20) DEFAULT 'PARENT' NOT NULL;
--> statement-breakpoint
ALTER TABLE "feedback_submissions" ADD COLUMN "manager_user_id" uuid;
--> statement-breakpoint
ALTER TABLE "feedback_submissions" ADD COLUMN "school_id" uuid;
--> statement-breakpoint
ALTER TABLE "feedback_submissions" ADD CONSTRAINT "feedback_submissions_manager_user_id_school_manager_users_id_fk" FOREIGN KEY ("manager_user_id") REFERENCES "public"."school_manager_users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "feedback_submissions" ADD CONSTRAINT "feedback_submissions_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "idx_feedback_manager_sender" ON "feedback_submissions" USING btree ("sender_type","manager_user_id","created_at");
--> statement-breakpoint
CREATE INDEX "idx_feedback_school" ON "feedback_submissions" USING btree ("school_id","created_at");
