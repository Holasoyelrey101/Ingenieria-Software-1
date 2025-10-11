-- 004_seed_logistica.sql
-- Datos de ejemplo para logística: vehículos y conductores

BEGIN;

-- Limpia catálogos (opcional, idempotente)
DELETE FROM route_assignments;
DELETE FROM delivery_route_stop;
DELETE FROM route_stops;
DELETE FROM routes;
DELETE FROM delivery_requests;

-- Inserta vehículos si no existen
INSERT INTO vehicles (code, capacity_kg, active)
SELECT v.code, v.capacity_kg, v.active
FROM (
    VALUES
        ('V-101', 1200, TRUE),
        ('V-102', 1000, TRUE),
        ('V-201', 800, TRUE),
        ('V-202', 600, TRUE),
        ('V-301', 1500, TRUE),
        ('V-XL-1', 3000, TRUE)
) AS v(code, capacity_kg, active)
LEFT JOIN vehicles t ON t.code = v.code
WHERE t.id IS NULL;

-- Inserta conductores si no existen
INSERT INTO drivers (name, license, active)
SELECT d.name, d.license, d.active
FROM (
    VALUES
        ('Ana Torres', 'A1-CHL-0001', TRUE),
        ('Bruno Díaz', 'A2-CHL-0002', TRUE),
        ('Carla Mella', 'A3-CHL-0003', TRUE),
        ('Diego Silva', 'A2-CHL-0004', TRUE),
        ('Elena Ríos', 'A1-CHL-0005', TRUE),
        ('Felipe Prado', 'A1-CHL-0006', TRUE)
) AS d(name, license, active)
LEFT JOIN drivers t ON t.license = d.license
WHERE t.id IS NULL;

COMMIT;
