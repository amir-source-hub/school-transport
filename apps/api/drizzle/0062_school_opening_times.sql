ALTER TABLE "schools" ADD COLUMN "opening_times" jsonb DEFAULT '[]'::jsonb NOT NULL;

UPDATE "schools"
SET "opening_times" = jsonb_build_array("opening_time")
WHERE jsonb_array_length("opening_times") = 0;
