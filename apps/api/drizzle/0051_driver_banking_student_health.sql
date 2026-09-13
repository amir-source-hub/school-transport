ALTER TABLE "drivers" ADD COLUMN IF NOT EXISTS "iban" varchar(26);
ALTER TABLE "drivers" ADD COLUMN IF NOT EXISTS "card_number" varchar(16);
ALTER TABLE "drivers" ADD COLUMN IF NOT EXISTS "bank_name" varchar(100);
ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "physical_status" varchar(20);
ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "disability_type" varchar(200);
