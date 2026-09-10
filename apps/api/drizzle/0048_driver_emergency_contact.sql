ALTER TABLE "drivers" ALTER COLUMN "license_expires_at" DROP NOT NULL;
ALTER TABLE "drivers" ADD COLUMN "emergency_first_name" varchar(100);
ALTER TABLE "drivers" ADD COLUMN "emergency_last_name" varchar(100);
ALTER TABLE "drivers" ADD COLUMN "emergency_relationship" varchar(100);

UPDATE "drivers"
SET "emergency_first_name" = 'ثبت نشده',
    "emergency_last_name" = 'ثبت نشده',
    "emergency_relationship" = 'ثبت نشده'
WHERE "emergency_first_name" IS NULL
   OR "emergency_last_name" IS NULL
   OR "emergency_relationship" IS NULL;

ALTER TABLE "drivers" ALTER COLUMN "emergency_first_name" SET NOT NULL;
ALTER TABLE "drivers" ALTER COLUMN "emergency_last_name" SET NOT NULL;
ALTER TABLE "drivers" ALTER COLUMN "emergency_relationship" SET NOT NULL;
