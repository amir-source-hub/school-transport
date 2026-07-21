CREATE TABLE IF NOT EXISTS "admin_users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"username" varchar(100) NOT NULL,
	"password_hash" varchar(255) NOT NULL,
	"first_name" varchar(100) NOT NULL,
	"last_name" varchar(100) NOT NULL,
	"email" varchar(255),
	"phone_number" varchar(20) NOT NULL,
	"status" varchar(20) DEFAULT 'ACTIVE' NOT NULL,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "admin_users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_type" varchar(20) NOT NULL,
	"actor_id" uuid NOT NULL,
	"action" varchar(50) NOT NULL,
	"entity_type" varchar(50) NOT NULL,
	"entity_id" uuid,
	"previous_values" text,
	"new_values" text,
	"ip_address" varchar(50),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "auth_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"subject_id" uuid NOT NULL,
	"role" varchar(20) NOT NULL,
	"refresh_token_hash" varchar(64) NOT NULL,
	"device_name" varchar(255),
	"ip_address" varchar(64),
	"user_agent" varchar(500),
	"expires_at" timestamp with time zone NOT NULL,
	"last_used_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"revocation_reason" varchar(100),
	"replaced_by_session_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "contracts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"registration_id" uuid NOT NULL,
	"registration_price_id" uuid NOT NULL,
	"payment_plan_id" uuid,
	"contract_number" varchar(50) NOT NULL,
	"contract_status" varchar(30) DEFAULT 'DRAFT' NOT NULL,
	"selected_address_id" uuid,
	"contract_data_snapshot" text,
	"file_storage_key" varchar(255),
	"version_number" integer DEFAULT 1 NOT NULL,
	"replaced_by_contract_id" uuid,
	"generated_by_admin_id" uuid,
	"generated_at" timestamp with time zone,
	"accepted_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "contracts_contract_number_unique" UNIQUE("contract_number")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "emergency_contacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"first_name" varchar(100) NOT NULL,
	"last_name" varchar(100) NOT NULL,
	"relationship" varchar(50) NOT NULL,
	"phone_number" varchar(20) NOT NULL,
	"secondary_phone_number" varchar(20),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "family_addresses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"title" varchar(50) NOT NULL,
	"province" varchar(100) NOT NULL,
	"city" varchar(100) NOT NULL,
	"district" varchar(100),
	"street_address" varchar(500) NOT NULL,
	"postal_code" varchar(20),
	"additional_details" varchar(500),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"notification_type" varchar(50) NOT NULL,
	"channel" varchar(20) DEFAULT 'IN_APP' NOT NULL,
	"title" varchar(200) NOT NULL,
	"message" text NOT NULL,
	"related_entity_type" varchar(50),
	"related_entity_id" uuid,
	"notification_status" varchar(20) DEFAULT 'PENDING' NOT NULL,
	"scheduled_at" timestamp with time zone,
	"sent_at" timestamp with time zone,
	"failure_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "otp_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"phone_number" varchar(20) NOT NULL,
	"purpose" varchar(50) NOT NULL,
	"code_hash" varchar(255) NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"max_attempts" integer DEFAULT 5 NOT NULL,
	"verified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "parents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"parent_type" varchar(10) NOT NULL,
	"first_name" varchar(100) NOT NULL,
	"last_name" varchar(100) NOT NULL,
	"national_id" varchar(20) NOT NULL,
	"phone_number" varchar(20) NOT NULL,
	"is_primary_contact" boolean DEFAULT false NOT NULL,
	"phone_verified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "parents_national_id_unique" UNIQUE("national_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "payment_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"registration_price_id" uuid NOT NULL,
	"plan_type" varchar(30) NOT NULL,
	"total_amount" integer NOT NULL,
	"prepayment_amount" integer DEFAULT 0 NOT NULL,
	"remaining_installment_amount" integer DEFAULT 0 NOT NULL,
	"installment_count" integer DEFAULT 4 NOT NULL,
	"plan_status" varchar(20) DEFAULT 'PENDING' NOT NULL,
	"activated_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "payment_schedule_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"payment_plan_id" uuid NOT NULL,
	"item_type" varchar(20) NOT NULL,
	"sequence_number" integer NOT NULL,
	"amount" integer NOT NULL,
	"due_date" timestamp with time zone,
	"item_status" varchar(20) DEFAULT 'PENDING' NOT NULL,
	"paid_amount" integer DEFAULT 0 NOT NULL,
	"paid_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "payment_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"payment_plan_id" uuid NOT NULL,
	"payment_schedule_item_id" uuid NOT NULL,
	"user_id" uuid,
	"amount" integer NOT NULL,
	"payment_method" varchar(30) NOT NULL,
	"gateway_name" varchar(50),
	"gateway_authority" varchar(255),
	"gateway_transaction_id" varchar(255),
	"idempotency_key" varchar(255),
	"transaction_status" varchar(30) DEFAULT 'CREATED' NOT NULL,
	"requested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"verified_at" timestamp with time zone,
	"failure_code" varchar(50),
	"failure_message" varchar(500),
	"recorded_by_admin_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payment_transactions_idempotency_key_unique" UNIQUE("idempotency_key")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "registration_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"registration_id" uuid NOT NULL,
	"admin_id" uuid NOT NULL,
	"note_type" varchar(30) NOT NULL,
	"content" text NOT NULL,
	"is_visible_to_parent" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "registration_prices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"registration_id" uuid NOT NULL,
	"version_number" integer DEFAULT 1 NOT NULL,
	"total_amount" integer NOT NULL,
	"currency" varchar(10) DEFAULT 'IRR' NOT NULL,
	"full_payment_allowed" boolean DEFAULT true NOT NULL,
	"installment_payment_allowed" boolean DEFAULT true NOT NULL,
	"prepayment_amount" integer DEFAULT 0 NOT NULL,
	"installment_count" integer DEFAULT 4 NOT NULL,
	"price_status" varchar(20) DEFAULT 'DRAFT' NOT NULL,
	"set_by_admin_id" uuid NOT NULL,
	"set_at" timestamp with time zone DEFAULT now() NOT NULL,
	"parent_confirmed_at" timestamp with time zone,
	"replaced_by_price_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "registration_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"registration_id" uuid NOT NULL,
	"admin_id" uuid NOT NULL,
	"review_action" varchar(30) NOT NULL,
	"comment" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "registration_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"registration_id" uuid NOT NULL,
	"snapshot_type" varchar(20) NOT NULL,
	"student_data" text,
	"parent_data" text,
	"selected_address_data" text,
	"emergency_contact_data" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "schools" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(200) NOT NULL,
	"school_type" varchar(20) DEFAULT 'PUBLIC' NOT NULL,
	"gender_type" varchar(10) DEFAULT 'MIXED' NOT NULL,
	"province" varchar(100) NOT NULL,
	"city" varchar(100) NOT NULL,
	"district" varchar(100),
	"address" varchar(500) NOT NULL,
	"phone_number" varchar(20),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "service_registrations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"academic_year" varchar(20) NOT NULL,
	"service_type" varchar(20) NOT NULL,
	"selected_address_id" uuid,
	"requested_start_date" timestamp with time zone,
	"registration_status" varchar(30) DEFAULT 'DRAFT' NOT NULL,
	"submission_number" integer DEFAULT 1 NOT NULL,
	"previous_registration_id" uuid,
	"submitted_at" timestamp with time zone,
	"reviewed_at" timestamp with time zone,
	"reviewed_by_admin_id" uuid,
	"rejection_reason" text,
	"parent_notes" text,
	"admin_notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "students" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"school_id" uuid NOT NULL,
	"first_name" varchar(100) NOT NULL,
	"last_name" varchar(100) NOT NULL,
	"national_id" varchar(20) NOT NULL,
	"birth_date" date,
	"gender" varchar(10),
	"grade" varchar(50),
	"class_name" varchar(50),
	"student_code" varchar(50),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "students_national_id_unique" UNIQUE("national_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"username" varchar(100) NOT NULL,
	"password_hash" varchar(255) NOT NULL,
	"account_status" varchar(20) DEFAULT 'ACTIVE' NOT NULL,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "contracts" ADD CONSTRAINT "contracts_registration_id_service_registrations_id_fk" FOREIGN KEY ("registration_id") REFERENCES "public"."service_registrations"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "contracts" ADD CONSTRAINT "contracts_registration_price_id_registration_prices_id_fk" FOREIGN KEY ("registration_price_id") REFERENCES "public"."registration_prices"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "contracts" ADD CONSTRAINT "contracts_payment_plan_id_payment_plans_id_fk" FOREIGN KEY ("payment_plan_id") REFERENCES "public"."payment_plans"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "contracts" ADD CONSTRAINT "contracts_generated_by_admin_id_admin_users_id_fk" FOREIGN KEY ("generated_by_admin_id") REFERENCES "public"."admin_users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "emergency_contacts" ADD CONSTRAINT "emergency_contacts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "family_addresses" ADD CONSTRAINT "family_addresses_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "parents" ADD CONSTRAINT "parents_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "payment_plans" ADD CONSTRAINT "payment_plans_registration_price_id_registration_prices_id_fk" FOREIGN KEY ("registration_price_id") REFERENCES "public"."registration_prices"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "payment_schedule_items" ADD CONSTRAINT "payment_schedule_items_payment_plan_id_payment_plans_id_fk" FOREIGN KEY ("payment_plan_id") REFERENCES "public"."payment_plans"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_payment_plan_id_payment_plans_id_fk" FOREIGN KEY ("payment_plan_id") REFERENCES "public"."payment_plans"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_payment_schedule_item_id_payment_schedule_items_id_fk" FOREIGN KEY ("payment_schedule_item_id") REFERENCES "public"."payment_schedule_items"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_recorded_by_admin_id_admin_users_id_fk" FOREIGN KEY ("recorded_by_admin_id") REFERENCES "public"."admin_users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "registration_notes" ADD CONSTRAINT "registration_notes_registration_id_service_registrations_id_fk" FOREIGN KEY ("registration_id") REFERENCES "public"."service_registrations"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "registration_notes" ADD CONSTRAINT "registration_notes_admin_id_admin_users_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."admin_users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "registration_prices" ADD CONSTRAINT "registration_prices_registration_id_service_registrations_id_fk" FOREIGN KEY ("registration_id") REFERENCES "public"."service_registrations"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "registration_prices" ADD CONSTRAINT "registration_prices_set_by_admin_id_admin_users_id_fk" FOREIGN KEY ("set_by_admin_id") REFERENCES "public"."admin_users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "registration_reviews" ADD CONSTRAINT "registration_reviews_registration_id_service_registrations_id_fk" FOREIGN KEY ("registration_id") REFERENCES "public"."service_registrations"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "registration_reviews" ADD CONSTRAINT "registration_reviews_admin_id_admin_users_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."admin_users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "registration_snapshots" ADD CONSTRAINT "registration_snapshots_registration_id_service_registrations_id_fk" FOREIGN KEY ("registration_id") REFERENCES "public"."service_registrations"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "service_registrations" ADD CONSTRAINT "service_registrations_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "service_registrations" ADD CONSTRAINT "service_registrations_reviewed_by_admin_id_admin_users_id_fk" FOREIGN KEY ("reviewed_by_admin_id") REFERENCES "public"."admin_users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "students" ADD CONSTRAINT "students_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "students" ADD CONSTRAINT "students_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_audit_entity_type" ON "audit_logs" USING btree ("entity_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_audit_entity_id" ON "audit_logs" USING btree ("entity_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_audit_actor" ON "audit_logs" USING btree ("actor_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_auth_sessions_token_hash" ON "auth_sessions" USING btree ("refresh_token_hash");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_auth_sessions_subject_role" ON "auth_sessions" USING btree ("subject_id","role");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_auth_sessions_expires_at" ON "auth_sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_auth_sessions_revoked_at" ON "auth_sessions" USING btree ("revoked_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_contracts_registration" ON "contracts" USING btree ("registration_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_contracts_number" ON "contracts" USING btree ("contract_number");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_contracts_reg_version" ON "contracts" USING btree ("registration_id","version_number");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_emergency_user" ON "emergency_contacts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_addresses_user" ON "family_addresses" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_notifications_user" ON "notifications" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_notifications_status" ON "notifications" USING btree ("notification_status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_otp_phone_purpose" ON "otp_requests" USING btree ("phone_number","purpose");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_parents_user_type" ON "parents" USING btree ("user_id","parent_type");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_parents_one_primary" ON "parents" USING btree ("user_id") WHERE "parents"."is_primary_contact" = true;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_parents_phone" ON "parents" USING btree ("phone_number");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_parents_national_id" ON "parents" USING btree ("national_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_plans_price" ON "payment_plans" USING btree ("registration_price_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_schedule_plan" ON "payment_schedule_items" USING btree ("payment_plan_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_schedule_due_date" ON "payment_schedule_items" USING btree ("due_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_schedule_status" ON "payment_schedule_items" USING btree ("item_status");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_schedule_type_seq" ON "payment_schedule_items" USING btree ("payment_plan_id","item_type","sequence_number");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_transactions_schedule_item" ON "payment_transactions" USING btree ("payment_schedule_item_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_transactions_status" ON "payment_transactions" USING btree ("transaction_status");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_transactions_idempotency" ON "payment_transactions" USING btree ("idempotency_key");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_transactions_gateway_transaction" ON "payment_transactions" USING btree ("gateway_transaction_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_transactions_one_success_per_schedule_item" ON "payment_transactions" USING btree ("payment_schedule_item_id") WHERE "payment_transactions"."transaction_status" = 'SUCCEEDED';--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_prices_registration" ON "registration_prices" USING btree ("registration_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_prices_version" ON "registration_prices" USING btree ("registration_id","version_number");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_reviews_registration" ON "registration_reviews" USING btree ("registration_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_registrations_student" ON "service_registrations" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_registrations_status" ON "service_registrations" USING btree ("registration_status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_registrations_academic_year" ON "service_registrations" USING btree ("academic_year");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_students_user" ON "students" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_students_school" ON "students" USING btree ("school_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_students_national_id" ON "students" USING btree ("national_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_users_username" ON "users" USING btree ("username");