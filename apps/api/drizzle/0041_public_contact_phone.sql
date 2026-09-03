ALTER TABLE "feedback_submissions"
ADD COLUMN IF NOT EXISTS "contact_phone" varchar(20);
