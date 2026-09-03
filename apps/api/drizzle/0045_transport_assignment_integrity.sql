CREATE OR REPLACE FUNCTION enforce_transport_run_assignment() RETURNS trigger AS $$
DECLARE
  run_school uuid;
  run_vehicle uuid;
  run_driver uuid;
  run_year varchar;
  pupil_school uuid;
  vehicle_capacity integer;
  assigned_count integer;
BEGIN
  -- Historical or mismatched assignments must always be removable.
  IF NOT NEW.is_active THEN RETURN NEW; END IF;
  SELECT school_id INTO pupil_school FROM students WHERE id = NEW.student_id FOR UPDATE;
  SELECT school_id, vehicle_id, driver_id, academic_year
    INTO run_school, run_vehicle, run_driver, run_year
    FROM transport_service_runs WHERE id = NEW.service_run_id AND is_active;
  IF run_school IS NULL OR pupil_school IS DISTINCT FROM run_school THEN
    RAISE EXCEPTION 'Student and active service run must belong to the same school';
  END IF;
  SELECT capacity INTO vehicle_capacity FROM vehicles WHERE id = run_vehicle FOR UPDATE;
  SELECT count(*) INTO assigned_count FROM transport_service_run_students
    WHERE service_run_id = NEW.service_run_id AND is_active AND id <> NEW.id;
  IF assigned_count >= vehicle_capacity THEN RAISE EXCEPTION 'Service run capacity exceeded'; END IF;
  IF EXISTS (
    SELECT 1 FROM transport_service_run_students m
    JOIN transport_service_runs r ON r.id = m.service_run_id
    WHERE m.student_id = NEW.student_id AND m.is_active AND m.id <> NEW.id
      AND r.is_active AND r.academic_year = run_year AND r.driver_id <> run_driver
  ) THEN RAISE EXCEPTION 'Both student directions must belong to the same driver'; END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
