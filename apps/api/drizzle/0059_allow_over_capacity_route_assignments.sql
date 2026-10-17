-- Capacity is advisory for admin route planning. Keep the active-run and
-- single-assignment-per-direction protections enforced in the database.
CREATE OR REPLACE FUNCTION enforce_transport_run_assignment() RETURNS trigger AS $$
DECLARE
  run_year varchar;
  run_direction varchar;
BEGIN
  IF NOT NEW.is_active THEN RETURN NEW; END IF;
  PERFORM id FROM students WHERE id = NEW.student_id FOR UPDATE;
  SELECT academic_year, direction INTO run_year, run_direction
    FROM transport_service_runs WHERE id = NEW.service_run_id AND is_active;
  IF run_year IS NULL THEN RAISE EXCEPTION 'Service run must be active'; END IF;
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
