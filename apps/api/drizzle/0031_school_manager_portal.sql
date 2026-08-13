CREATE TABLE "school_manager_users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"username" varchar(100) NOT NULL,
	"first_name" varchar(100) NOT NULL,
	"last_name" varchar(100) NOT NULL,
	"phone_number" varchar(20) NOT NULL,
	"email" varchar(255),
	"password_hash" varchar(255) NOT NULL,
	"status" varchar(20) DEFAULT 'ACTIVE' NOT NULL,
	"must_change_credentials" boolean DEFAULT true NOT NULL,
	"credentials_changed_at" timestamp with time zone,
	"failed_login_count" integer DEFAULT 0 NOT NULL,
	"locked_until" timestamp with time zone,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "school_manager_users_username_unique" UNIQUE("username"),
	CONSTRAINT "school_manager_users_phone_number_unique" UNIQUE("phone_number")
);
--> statement-breakpoint
CREATE TABLE "school_manager_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"manager_user_id" uuid NOT NULL,
	"school_id" uuid NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"status" varchar(20) DEFAULT 'ACTIVE' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "school_manager_assignments" ADD CONSTRAINT "school_manager_assignments_manager_user_id_school_manager_users_id_fk" FOREIGN KEY ("manager_user_id") REFERENCES "public"."school_manager_users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "school_manager_assignments" ADD CONSTRAINT "school_manager_assignments_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "idx_school_manager_assignment_unique" ON "school_manager_assignments" USING btree ("manager_user_id","school_id");
--> statement-breakpoint
CREATE INDEX "idx_school_manager_assignment_manager" ON "school_manager_assignments" USING btree ("manager_user_id","status");
--> statement-breakpoint
CREATE INDEX "idx_school_manager_assignment_school" ON "school_manager_assignments" USING btree ("school_id","status");
