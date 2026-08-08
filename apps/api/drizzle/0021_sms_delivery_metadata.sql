ALTER TABLE "notifications" ADD COLUMN "purpose" varchar(30);
ALTER TABLE "notifications" ADD COLUMN "provider_message_id" varchar(100);
CREATE INDEX "idx_notifications_provider_message" ON "notifications" USING btree ("provider_message_id");
