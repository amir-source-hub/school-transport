ALTER TABLE "drivers" ADD COLUMN IF NOT EXISTS "latitude" double precision;
ALTER TABLE "drivers" ADD COLUMN IF NOT EXISTS "longitude" double precision;

-- Existing rows must be geocoded before these columns can safely become NOT NULL.
