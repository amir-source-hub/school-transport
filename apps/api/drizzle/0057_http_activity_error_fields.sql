-- Store only server-defined field identifiers, never submitted or saved values.
ALTER TABLE http_activity_logs ADD COLUMN error_fields text[];
--> statement-breakpoint
ALTER TABLE http_activity_logs ADD COLUMN error_category varchar(50);
--> statement-breakpoint
ALTER TABLE http_activity_logs ADD COLUMN database_code varchar(20);
