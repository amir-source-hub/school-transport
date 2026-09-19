-- Bring vehicles with the previous standard capacities to the new standards.
-- Vehicles with other configured capacities remain unchanged.
UPDATE vehicles SET capacity = 40 WHERE vehicle_type = 'BUS' AND capacity = 30;
--> statement-breakpoint
UPDATE vehicles SET capacity = 21 WHERE vehicle_type = 'MINIBUS' AND capacity = 16;
