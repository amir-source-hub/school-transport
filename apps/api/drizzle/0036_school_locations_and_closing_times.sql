ALTER TABLE "schools" ADD COLUMN IF NOT EXISTS "closing_times" jsonb DEFAULT '[]'::jsonb NOT NULL;
ALTER TABLE "schools" ADD COLUMN IF NOT EXISTS "latitude" double precision;
ALTER TABLE "schools" ADD COLUMN IF NOT EXISTS "longitude" double precision;
UPDATE "schools" SET "closing_times" = jsonb_build_array("closing_time") WHERE "closing_times" = '[]'::jsonb;
