CREATE TABLE IF NOT EXISTS "drivers" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "first_name" varchar(100) NOT NULL,
  "last_name" varchar(100) NOT NULL,
  "father_name" varchar(100),
  "national_id" varchar(10) NOT NULL UNIQUE,
  "phone_number" varchar(20) NOT NULL,
  "gender" varchar(10),
  "education" varchar(100),
  "license_expires_at" date,
  "status" varchar(20) DEFAULT 'ACTIVE' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "vehicles" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "driver_id" uuid NOT NULL REFERENCES "drivers"("id"),
  "vehicle_type" varchar(50) NOT NULL,
  "system" varchar(100) NOT NULL,
  "model_year" integer NOT NULL,
  "plate_number" varchar(30) NOT NULL,
  "capacity" integer NOT NULL CHECK ("capacity" > 0),
  "status" varchar(20) DEFAULT 'ACTIVE' NOT NULL,
  "technical_inspection_expires_at" date,
  "insurance_expires_at" date,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "idx_vehicles_driver" ON "vehicles" ("driver_id");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_vehicles_plate_unique" ON "vehicles" ("plate_number");

CREATE TABLE IF NOT EXISTS "transport_service_runs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "school_id" uuid NOT NULL REFERENCES "schools"("id"),
  "driver_id" uuid NOT NULL REFERENCES "drivers"("id"),
  "vehicle_id" uuid NOT NULL REFERENCES "vehicles"("id"),
  "academic_year" varchar(20) NOT NULL,
  "title" varchar(100) NOT NULL,
  "direction" varchar(12) NOT NULL CHECK ("direction" IN ('TO_SCHOOL', 'FROM_SCHOOL')),
  "sequence_number" integer NOT NULL CHECK ("sequence_number" > 0),
  "scheduled_start_time" time NOT NULL,
  "scheduled_arrival_time" time NOT NULL,
  "area_description" text,
  "active_weekdays" integer[] DEFAULT '{}' NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "idx_transport_runs_school" ON "transport_service_runs" ("school_id");
CREATE INDEX IF NOT EXISTS "idx_transport_runs_driver" ON "transport_service_runs" ("driver_id");
CREATE INDEX IF NOT EXISTS "idx_transport_runs_vehicle" ON "transport_service_runs" ("vehicle_id");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_transport_runs_schedule_unique" ON "transport_service_runs" ("vehicle_id", "academic_year", "direction", "sequence_number");

CREATE TABLE IF NOT EXISTS "transport_service_run_students" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "service_run_id" uuid NOT NULL REFERENCES "transport_service_runs"("id"),
  "student_id" uuid NOT NULL REFERENCES "students"("id"),
  "pickup_order" integer NOT NULL CHECK ("pickup_order" > 0),
  "notes" text,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "idx_transport_run_student_unique" ON "transport_service_run_students" ("service_run_id", "student_id");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_transport_run_pickup_order_unique" ON "transport_service_run_students" ("service_run_id", "pickup_order");
CREATE INDEX IF NOT EXISTS "idx_transport_run_students_student" ON "transport_service_run_students" ("student_id");

CREATE TABLE IF NOT EXISTS "transport_documents" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "driver_id" uuid REFERENCES "drivers"("id"),
  "vehicle_id" uuid REFERENCES "vehicles"("id"),
  "document_type" varchar(50) NOT NULL,
  "page_number" integer DEFAULT 1 NOT NULL CHECK ("page_number" > 0),
  "object_key" varchar(500) NOT NULL,
  "mime_type" varchar(100) NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "transport_document_owner_check" CHECK (("driver_id" IS NOT NULL) <> ("vehicle_id" IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS "idx_transport_documents_driver" ON "transport_documents" ("driver_id");
CREATE INDEX IF NOT EXISTS "idx_transport_documents_vehicle" ON "transport_documents" ("vehicle_id");

CREATE OR REPLACE FUNCTION enforce_transport_run_vehicle_driver() RETURNS trigger AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM vehicles WHERE id = NEW.vehicle_id AND driver_id = NEW.driver_id) THEN
    RAISE EXCEPTION 'The selected vehicle is not assigned to this driver';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS "trg_enforce_transport_run_vehicle_driver" ON "transport_service_runs";
CREATE TRIGGER "trg_enforce_transport_run_vehicle_driver"
BEFORE INSERT OR UPDATE ON "transport_service_runs"
FOR EACH ROW EXECUTE FUNCTION enforce_transport_run_vehicle_driver();

CREATE OR REPLACE FUNCTION enforce_transport_run_assignment() RETURNS trigger AS $$
DECLARE
  run_school uuid;
  run_vehicle uuid;
  vehicle_capacity integer;
  assigned_count integer;
BEGIN
  SELECT school_id, vehicle_id INTO run_school, run_vehicle FROM transport_service_runs WHERE id = NEW.service_run_id;
  SELECT capacity INTO vehicle_capacity FROM vehicles WHERE id = run_vehicle FOR UPDATE;
  IF NOT EXISTS (SELECT 1 FROM students WHERE id = NEW.student_id AND school_id = run_school) THEN
    RAISE EXCEPTION 'Student and service run must belong to the same school';
  END IF;
  SELECT count(*) INTO assigned_count FROM transport_service_run_students WHERE service_run_id = NEW.service_run_id AND is_active AND id <> NEW.id;
  IF NEW.is_active AND assigned_count >= vehicle_capacity THEN
    RAISE EXCEPTION 'Service run capacity exceeded';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS "trg_enforce_transport_run_assignment" ON "transport_service_run_students";
CREATE TRIGGER "trg_enforce_transport_run_assignment"
BEFORE INSERT OR UPDATE ON "transport_service_run_students"
FOR EACH ROW EXECUTE FUNCTION enforce_transport_run_assignment();
