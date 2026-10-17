CREATE OR REPLACE FUNCTION enforce_transport_run_assignment() RETURNS trigger AS $$
DECLARE
  run_vehicle uuid;
  run_year varchar;
  run_direction varchar;
  vehicle_capacity integer;
  assigned_count integer;
BEGIN
  IF NOT NEW.is_active THEN RETURN NEW; END IF;
  PERFORM id FROM students WHERE id = NEW.student_id FOR UPDATE;
  SELECT vehicle_id, academic_year, direction INTO run_vehicle, run_year, run_direction
    FROM transport_service_runs WHERE id = NEW.service_run_id AND is_active;
  IF run_vehicle IS NULL THEN RAISE EXCEPTION 'Service run must be active'; END IF;
  SELECT capacity INTO vehicle_capacity FROM vehicles WHERE id = run_vehicle FOR UPDATE;
  SELECT count(*) INTO assigned_count FROM transport_service_run_students
    WHERE service_run_id = NEW.service_run_id AND is_active AND id <> NEW.id;
  IF assigned_count >= vehicle_capacity THEN RAISE EXCEPTION 'Service run capacity exceeded'; END IF;
  IF EXISTS (
    SELECT 1 FROM transport_service_run_students m
    JOIN transport_service_runs r ON r.id = m.service_run_id
    WHERE m.student_id = NEW.student_id AND m.is_active AND m.id <> NEW.id
      AND r.is_active AND r.academic_year = run_year
      AND (r.direction = run_direction OR r.direction = 'ROUND_TRIP' OR run_direction = 'ROUND_TRIP')
  ) THEN RAISE EXCEPTION 'Student already has an active route for this direction'; END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
