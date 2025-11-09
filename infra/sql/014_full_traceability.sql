-- ============================================================================
-- 014_full_traceability.sql
-- TRAZABILIDAD COMPLETA ENTRE MODULOS
-- Autor: Sistema
-- Fecha: 2025-11-08
-- ============================================================================

-- ============================================================================
-- 1. AGREGAR FOREIGN KEY: dynamic_shifts.route_id -> delivery_requests.id
-- ============================================================================

-- Primero, limpiar datos huérfanos (dynamic_shifts sin delivery_request válido)
UPDATE dynamic_shifts 
SET route_id = NULL 
WHERE route_id IS NOT NULL 
AND route_id NOT IN (SELECT id FROM delivery_requests);

-- Agregar foreign key con CASCADE para trazabilidad
ALTER TABLE dynamic_shifts
DROP CONSTRAINT IF EXISTS fk_dynamic_shift_route;

ALTER TABLE dynamic_shifts
ADD CONSTRAINT fk_dynamic_shift_route 
FOREIGN KEY (route_id) 
REFERENCES delivery_requests(id) 
ON DELETE CASCADE 
ON UPDATE CASCADE;

COMMENT ON CONSTRAINT fk_dynamic_shift_route ON dynamic_shifts IS 
'Trazabilidad: Si se elimina una ruta, se eliminan sus turnos dinámicos asociados';


-- ============================================================================
-- 2. SINCRONIZAR STATUS ENTRE delivery_requests Y dynamic_shifts
-- ============================================================================

-- Corregir inconsistencias actuales: si delivery_request está "assigned", 
-- el dynamic_shift debe estar "asignado"
UPDATE dynamic_shifts ds
SET status = 'asignado'
FROM delivery_requests dr
WHERE ds.route_id = dr.id 
AND dr.status = 'assigned'
AND ds.status != 'asignado';

-- Corregir: si dynamic_shift está "completado", delivery_request debe estar "completed"
UPDATE delivery_requests dr
SET status = 'completed'
FROM dynamic_shifts ds
WHERE ds.route_id = dr.id 
AND ds.status = 'completado'
AND dr.status != 'completed';


-- ============================================================================
-- 3. TRIGGER: SINCRONIZACION AUTOMATICA DE STATUS
-- ============================================================================

-- Trigger para sincronizar cuando cambia delivery_request.status
CREATE OR REPLACE FUNCTION sync_delivery_to_dynamic_shift()
RETURNS TRIGGER AS $$
BEGIN
    -- Si delivery_request cambia a "assigned", dynamic_shift debe ser "asignado"
    IF NEW.status = 'assigned' THEN
        UPDATE dynamic_shifts
        SET status = 'asignado', assigned_at = COALESCE(assigned_at, NOW())
        WHERE route_id = NEW.id AND status != 'asignado';
    END IF;

    -- Si delivery_request cambia a "completed", dynamic_shift debe ser "completado"
    IF NEW.status = 'completed' THEN
        UPDATE dynamic_shifts
        SET status = 'completado', completed_at = COALESCE(completed_at, NOW())
        WHERE route_id = NEW.id AND status != 'completado';
    END IF;

    -- Si delivery_request cambia a "cancelled", dynamic_shift debe ser "cancelado"
    IF NEW.status = 'cancelled' THEN
        UPDATE dynamic_shifts
        SET status = 'cancelado'
        WHERE route_id = NEW.id AND status NOT IN ('completado', 'cancelado');
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sync_delivery_status ON delivery_requests;

CREATE TRIGGER trigger_sync_delivery_status
AFTER UPDATE OF status ON delivery_requests
FOR EACH ROW
EXECUTE FUNCTION sync_delivery_to_dynamic_shift();

COMMENT ON FUNCTION sync_delivery_to_dynamic_shift() IS 
'Sincroniza automáticamente el status de delivery_requests con dynamic_shifts';


-- Trigger para sincronizar cuando cambia dynamic_shift.status
CREATE OR REPLACE FUNCTION sync_dynamic_shift_to_delivery()
RETURNS TRIGGER AS $$
BEGIN
    -- Si dynamic_shift cambia a "completado", delivery_request debe ser "completed"
    IF NEW.status = 'completado' THEN
        UPDATE delivery_requests
        SET status = 'completed', updated_at = NOW()
        WHERE id = NEW.route_id AND status != 'completed';
    END IF;

    -- Si dynamic_shift cambia a "cancelado", delivery_request debe ser "cancelled"
    IF NEW.status = 'cancelado' THEN
        UPDATE delivery_requests
        SET status = 'cancelled', updated_at = NOW()
        WHERE id = NEW.route_id AND status NOT IN ('completed', 'cancelled');
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sync_dynamic_shift_status ON dynamic_shifts;

CREATE TRIGGER trigger_sync_dynamic_shift_status
AFTER UPDATE OF status ON dynamic_shifts
FOR EACH ROW
WHEN (NEW.route_id IS NOT NULL)
EXECUTE FUNCTION sync_dynamic_shift_to_delivery();

COMMENT ON FUNCTION sync_dynamic_shift_to_delivery() IS 
'Sincroniza automáticamente el status de dynamic_shifts con delivery_requests';


-- ============================================================================
-- 4. TRIGGER: SINCRONIZACION DE DRIVER_ID
-- ============================================================================

-- Cuando se crea un dynamic_shift_assignment, actualizar delivery_request.driver_id
CREATE OR REPLACE FUNCTION sync_driver_assignment()
RETURNS TRIGGER AS $$
BEGIN
    -- Actualizar driver_id en delivery_request cuando se asigna un conductor
    UPDATE delivery_requests dr
    SET driver_id = NEW.employee_id, updated_at = NOW()
    FROM dynamic_shifts ds
    WHERE ds.id = NEW.dynamic_shift_id 
    AND ds.route_id = dr.id
    AND dr.driver_id IS DISTINCT FROM NEW.employee_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sync_driver ON dynamic_shift_assignments;

CREATE TRIGGER trigger_sync_driver
AFTER INSERT OR UPDATE OF employee_id ON dynamic_shift_assignments
FOR EACH ROW
EXECUTE FUNCTION sync_driver_assignment();

COMMENT ON FUNCTION sync_driver_assignment() IS 
'Sincroniza el conductor asignado entre dynamic_shifts y delivery_requests';


-- ============================================================================
-- 5. TRIGGER: CASCADE DELETE AUTOMATICO
-- ============================================================================

-- Cuando se elimina un delivery_request, el dynamic_shift debe eliminarse automáticamente
-- (Ya está manejado por ON DELETE CASCADE en la FK, pero agregamos log)
CREATE OR REPLACE FUNCTION log_cascade_delete()
RETURNS TRIGGER AS $$
BEGIN
    RAISE NOTICE 'delivery_request % eliminado, dynamic_shifts asociados serán eliminados por CASCADE', OLD.id;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_log_delivery_delete ON delivery_requests;

CREATE TRIGGER trigger_log_delivery_delete
BEFORE DELETE ON delivery_requests
FOR EACH ROW
EXECUTE FUNCTION log_cascade_delete();


-- ============================================================================
-- 6. VISTA: TRAZABILIDAD COMPLETA
-- ============================================================================

CREATE OR REPLACE VIEW v_route_traceability AS
SELECT 
    dr.id AS delivery_request_id,
    dr.origin_address,
    dr.destination_address,
    dr.status AS delivery_status,
    dr.driver_id,
    dr.created_at AS route_created,
    
    ds.id AS dynamic_shift_id,
    ds.fecha_programada,
    ds.hora_inicio,
    ds.duracion_minutos,
    ds.status AS shift_status,
    ds.created_at AS shift_created,
    
    dsa.id AS assignment_id,
    dsa.employee_id,
    e.nombre AS conductor_nombre,
    dsa.status AS assignment_status,
    
    -- Indicador de consistencia
    CASE 
        WHEN dr.status = 'assigned' AND ds.status = 'asignado' THEN 'OK'
        WHEN dr.status = 'completed' AND ds.status = 'completado' THEN 'OK'
        WHEN dr.driver_id = dsa.employee_id THEN 'OK'
        ELSE '⚠ INCONSISTENTE'
    END AS trazabilidad_status
    
FROM delivery_requests dr
LEFT JOIN dynamic_shifts ds ON dr.id = ds.route_id
LEFT JOIN dynamic_shift_assignments dsa ON ds.id = dsa.dynamic_shift_id
LEFT JOIN employees e ON dsa.employee_id = e.id
ORDER BY dr.created_at DESC;

COMMENT ON VIEW v_route_traceability IS 
'Vista consolidada de trazabilidad completa: Rutas -> Turnos -> Asignaciones';


-- ============================================================================
-- 7. CORRECCION DE DATOS EXISTENTES
-- ============================================================================

-- Asegurar que todos los dynamic_shifts tengan route_id correcto
-- (Relacionar por timestamp y driver_id)
UPDATE dynamic_shifts ds
SET route_id = dr.id
FROM delivery_requests dr
WHERE ds.route_id IS NULL
AND ds.created_at >= dr.created_at
AND ds.created_at <= dr.created_at + interval '5 seconds'
AND EXISTS (
    SELECT 1 FROM dynamic_shift_assignments dsa
    WHERE dsa.dynamic_shift_id = ds.id
    AND dsa.employee_id = dr.driver_id
);

-- Sincronizar status de dynamic_shifts pendientes
UPDATE dynamic_shifts ds
SET status = 'asignado'
FROM delivery_requests dr
WHERE ds.route_id = dr.id
AND dr.status = 'assigned'
AND ds.status = 'pendiente';

-- Log de correcciones aplicadas
DO $$
DECLARE
    total_routes INT;
    total_shifts INT;
    consistent_count INT;
BEGIN
    SELECT COUNT(*) INTO total_routes FROM delivery_requests;
    SELECT COUNT(*) INTO total_shifts FROM dynamic_shifts WHERE route_id IS NOT NULL;
    SELECT COUNT(*) INTO consistent_count FROM v_route_traceability WHERE trazabilidad_status = 'OK';
    
    RAISE NOTICE '====================================';
    RAISE NOTICE 'TRAZABILIDAD CONFIGURADA';
    RAISE NOTICE '====================================';
    RAISE NOTICE 'Total delivery_requests: %', total_routes;
    RAISE NOTICE 'Total dynamic_shifts vinculados: %', total_shifts;
    RAISE NOTICE 'Registros consistentes: %', consistent_count;
    RAISE NOTICE '====================================';
END $$;
