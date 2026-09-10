CREATE TABLE IF NOT EXISTS "student_companions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "student_id" uuid NOT NULL REFERENCES "students"("id") ON DELETE CASCADE,
  "first_name" varchar(100) NOT NULL,
  "last_name" varchar(100) NOT NULL,
  "father_name" varchar(100) NOT NULL,
  "national_id" varchar(10) NOT NULL UNIQUE,
  "phone_number" varchar(11) NOT NULL,
  "relationship" varchar(20) NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "student_companions_relationship_check" CHECK ("relationship" IN ('FAMILY', 'CAREGIVER', 'COACH'))
);
CREATE UNIQUE INDEX IF NOT EXISTS "student_companions_student_unique" ON "student_companions" ("student_id");
