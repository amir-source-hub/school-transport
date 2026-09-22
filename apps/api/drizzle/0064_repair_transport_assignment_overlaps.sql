-- Keep exactly one active assignment per student, academic year, and direction.
-- A round-trip assignment is exclusive and wins over separate one-way assignments.
WITH active_assignments AS (
  SELECT
    m.id,
    m.student_id,
    r.academic_year,
    r.direction,
    row_number() OVER (
      PARTITION BY m.student_id, r.academic_year, r.direction
      ORDER BY m.created_at DESC, m.id DESC
    ) AS direction_rank
  FROM transport_service_run_students AS m
  INNER JOIN transport_service_runs AS r ON r.id = m.service_run_id
  WHERE m.is_active = true
    AND r.is_active = true
),
round_trip_choice AS (
  SELECT student_id, academic_year, id
  FROM active_assignments
  WHERE direction = 'ROUND_TRIP'
    AND direction_rank = 1
),
invalid_assignments AS (
  SELECT assignment.id
  FROM active_assignments AS assignment
  LEFT JOIN round_trip_choice AS round_trip
    ON round_trip.student_id = assignment.student_id
   AND round_trip.academic_year = assignment.academic_year
  WHERE
    (round_trip.id IS NOT NULL AND assignment.id <> round_trip.id)
    OR (round_trip.id IS NULL AND assignment.direction_rank > 1)
)
UPDATE transport_service_run_students AS membership
SET is_active = false
FROM invalid_assignments
WHERE membership.id = invalid_assignments.id;

-- Reassert the database-level concurrency guard after cleaning legacy overlaps.
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
