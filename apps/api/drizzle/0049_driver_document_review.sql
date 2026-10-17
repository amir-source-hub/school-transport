ALTER TABLE "transport_documents"
  ADD COLUMN IF NOT EXISTS "review_status" varchar(20) NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN IF NOT EXISTS "rejection_reason" varchar(500),
  ADD COLUMN IF NOT EXISTS "reviewed_at" timestamp with time zone;
