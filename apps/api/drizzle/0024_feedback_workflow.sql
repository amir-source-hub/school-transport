CREATE TABLE "feedback_submissions" (
 "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
 "user_id" uuid NOT NULL REFERENCES "users"("id"),
 "student_id" uuid REFERENCES "students"("id"),
 "category" varchar(30) NOT NULL, "subject" varchar(120) NOT NULL, "message" text NOT NULL,
 "status" varchar(20) DEFAULT 'NEW' NOT NULL, "priority" varchar(20) DEFAULT 'NORMAL' NOT NULL,
 "assignee_id" uuid REFERENCES "admin_users"("id"), "read_at" timestamp with time zone,
 "response" text, "responder_id" uuid REFERENCES "admin_users"("id"), "responded_at" timestamp with time zone,
 "closed_at" timestamp with time zone, "version" integer DEFAULT 1 NOT NULL,
 "created_at" timestamp with time zone DEFAULT now() NOT NULL, "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX "idx_feedback_user" ON "feedback_submissions" ("user_id", "created_at");
CREATE INDEX "idx_feedback_queue" ON "feedback_submissions" ("status", "priority", "created_at");
