-- 003_incidents_add_vehicle_driver.sql
-- HU5: Asociar incidente a vehículo/conductor de forma opcional

BEGIN;

ALTER TABLE incidents
    ADD COLUMN IF NOT EXISTS vehicle_id INT REFERENCES vehicles(id),
    ADD COLUMN IF NOT EXISTS driver_id INT REFERENCES drivers(id);

CREATE INDEX IF NOT EXISTS ix_incidents_vehicle ON incidents(vehicle_id);
CREATE INDEX IF NOT EXISTS ix_incidents_driver ON incidents(driver_id);

COMMIT;
