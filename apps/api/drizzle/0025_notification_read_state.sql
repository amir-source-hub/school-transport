ALTER TABLE "notifications" ADD COLUMN "read_at" timestamp with time zone;

-- Map legacy in-app read state into the new acknowledgement column before the
-- delivery-status normalization below. Old in-app PENDING meant "delivered but
-- unread"; old SENT meant "read". SMS delivery rows are left untouched.
UPDATE "notifications"
SET "read_at" = COALESCE("sent_at", "updated_at", "created_at")
WHERE "channel" = 'IN_APP' AND "notification_status" = 'SENT';

-- In-app delivery is accepted the moment the row exists. The delivery status for
-- an in-app row is therefore always SENT; acknowledgement lives in read_at.
UPDATE "notifications"
SET "notification_status" = 'SENT'
WHERE "channel" = 'IN_APP';

-- Stable cursor pagination and per-user channel listing.
CREATE INDEX "idx_notifications_user_channel_created"
  ON "notifications" USING btree ("user_id", "channel", "created_at", "id");
-- Unread queries for the authenticated panel.
CREATE INDEX "idx_notifications_user_channel_unread"
  ON "notifications" USING btree ("user_id", "channel") WHERE "read_at" IS NULL;
-- Delivery dispatch and operational status scans.
CREATE INDEX "idx_notifications_channel_status_created"
  ON "notifications" USING btree ("channel", "notification_status", "created_at");
