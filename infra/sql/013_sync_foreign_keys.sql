-- 013_sync_foreign_keys.sql
-- -*- coding: utf-8 -*-
-- Agregar foreign keys para garantizar integridad referencial entre microservicios
-- Este script establece relaciones que antes eran "soft references"

SET client_encoding = 'UTF8';

BEGIN;

-- ============================================
-- 1. VERIFICAR Y LIMPIAR DATOS HUÉRFANOS
-- ============================================

-- Limpiar delivery_requests con driver_id que no existe en employees
UPDATE delivery_requests 
SET driver_id = NULL 
WHERE driver_id IS NOT NULL 
  AND driver_id NOT IN (SELECT id FROM employees);

-- Limpiar delivery_requests con vehicle_id que no existe en vehicles  
UPDATE delivery_requests 
SET vehicle_id = NULL 
WHERE vehicle_id IS NOT NULL 
  AND vehicle_id NOT IN (SELECT id FROM vehicles);

-- Limpiar route_assignments con driver_id inválido
UPDATE route_assignments 
SET driver_id = NULL 
WHERE driver_id IS NOT NULL 
  AND driver_id NOT IN (SELECT id FROM employees);

-- Limpiar route_assignments con vehicle_id inválido
UPDATE route_assignments 
SET vehicle_id = NULL 
WHERE vehicle_id IS NOT NULL 
  AND vehicle_id NOT IN (SELECT id FROM vehicles);

-- ============================================
-- 2. AGREGAR FOREIGN KEYS
-- ============================================

-- delivery_requests.driver_id → employees.id
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_delivery_driver'
    ) THEN
        ALTER TABLE delivery_requests 
          ADD CONSTRAINT fk_delivery_driver 
          FOREIGN KEY (driver_id) 
          REFERENCES employees(id) 
          ON DELETE SET NULL;
        
        RAISE NOTICE 'Foreign key fk_delivery_driver created';
    ELSE
        RAISE NOTICE 'Foreign key fk_delivery_driver already exists';
    END IF;
END $$;

-- delivery_requests.vehicle_id → vehicles.id
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_delivery_vehicle'
    ) THEN
        ALTER TABLE delivery_requests 
          ADD CONSTRAINT fk_delivery_vehicle 
          FOREIGN KEY (vehicle_id) 
          REFERENCES vehicles(id) 
          ON DELETE SET NULL;
        
        RAISE NOTICE 'Foreign key fk_delivery_vehicle created';
    ELSE
        RAISE NOTICE 'Foreign key fk_delivery_vehicle already exists';
    END IF;
END $$;

-- route_assignments.driver_id → employees.id
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_route_assignment_driver'
    ) THEN
        ALTER TABLE route_assignments 
          ADD CONSTRAINT fk_route_assignment_driver 
          FOREIGN KEY (driver_id) 
          REFERENCES employees(id) 
          ON DELETE SET NULL;
        
        RAISE NOTICE 'Foreign key fk_route_assignment_driver created';
    ELSE
        RAISE NOTICE 'Foreign key fk_route_assignment_driver already exists';
    END IF;
END $$;

-- route_assignments.vehicle_id → vehicles.id
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_route_assignment_vehicle'
    ) THEN
        ALTER TABLE route_assignments 
          ADD CONSTRAINT fk_route_assignment_vehicle 
          FOREIGN KEY (vehicle_id) 
          REFERENCES vehicles(id) 
          ON DELETE SET NULL;
        
        RAISE NOTICE 'Foreign key fk_route_assignment_vehicle created';
    ELSE
        RAISE NOTICE 'Foreign key fk_route_assignment_vehicle already exists';
    END IF;
END $$;

-- ============================================
-- 3. VERIFICACIÓN POST-MIGRACIÓN
-- ============================================

-- Mostrar foreign keys creadas
SELECT
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name IN ('delivery_requests', 'route_assignments')
ORDER BY tc.table_name, tc.constraint_name;

COMMIT;
