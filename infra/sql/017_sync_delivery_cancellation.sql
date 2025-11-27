-- =====================================================
-- HU2: Trigger para Liberar Carga al Cancelar Ruta
-- =====================================================
-- Este trigger se ejecuta automáticamente cuando el status
-- de una delivery_request cambia a 'cancelado'.
-- 
-- Acciones automáticas:
-- 1. Libera el vehículo (status = 'disponible')
-- 2. Cancela el turno dinámico asociado
-- 3. Resetea vehicle_id y driver_id en delivery_request
-- 4. Registra la acción en audit_log (si existe)
-- =====================================================

-- Función que se ejecuta cuando se cancela una ruta
CREATE OR REPLACE FUNCTION sync_delivery_cancellation()
RETURNS TRIGGER AS $$
DECLARE
  v_vehicle_id INTEGER;
  v_driver_id INTEGER;
BEGIN
  -- Solo actuar si el status cambió a 'cancelado' desde otro estado
  IF NEW.status = 'cancelado' AND (OLD.status IS NULL OR OLD.status != 'cancelado') THEN
    
    -- Guardar IDs antes de resetear
    v_vehicle_id := OLD.vehicle_id;
    v_driver_id := OLD.driver_id;
    
    RAISE NOTICE 'Cancelando ruta ID=%: vehicle_id=%, driver_id=%', OLD.id, v_vehicle_id, v_driver_id;
    
    -- 1. Resetear vehicle_id y driver_id en delivery_request
    NEW.vehicle_id := NULL;
    NEW.driver_id := NULL;
    
    -- 2. Liberar vehículo (si estaba asignado)
    IF v_vehicle_id IS NOT NULL THEN
      UPDATE vehicles 
      SET status = 'disponible',
          current_location = NULL
      WHERE id = v_vehicle_id;
      
      RAISE NOTICE 'Vehículo % liberado', v_vehicle_id;
    END IF;
    
    -- 3. Cancelar turno dinámico asociado (si existe)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'dynamic_shifts') THEN
      UPDATE dynamic_shifts 
      SET status = 'cancelado',
          end_time = NOW()
      WHERE delivery_request_id = OLD.id
        AND status != 'cancelado';
      
      RAISE NOTICE 'Turno dinámico cancelado para delivery_request_id=%', OLD.id;
    END IF;
    
    -- 4. Registrar en audit_log (si la tabla existe)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'audit_log') THEN
      INSERT INTO audit_log (
        entity_type, 
        entity_id, 
        action, 
        details,
        created_at
      )
      VALUES (
        'delivery_request',
        OLD.id,
        'route_cancelled',
        json_build_object(
          'previous_vehicle_id', v_vehicle_id,
          'previous_driver_id', v_driver_id,
          'cancelled_at', NOW(),
          'previous_status', OLD.status
        ),
        NOW()
      );
      
      RAISE NOTICE 'Registro de auditoría creado';
    END IF;
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Eliminar trigger si existe (para permitir re-ejecución del script)
DROP TRIGGER IF EXISTS trigger_sync_delivery_cancellation ON delivery_requests;

-- Crear trigger que se ejecuta ANTES de UPDATE
-- Usamos BEFORE para poder modificar NEW antes de que se guarde
CREATE TRIGGER trigger_sync_delivery_cancellation
BEFORE UPDATE OF status ON delivery_requests
FOR EACH ROW
EXECUTE FUNCTION sync_delivery_cancellation();

-- Mensaje de confirmación
DO $$
BEGIN
  RAISE NOTICE '✅ Trigger sync_delivery_cancellation creado exitosamente';
  RAISE NOTICE '📋 El trigger se ejecutará automáticamente cuando status cambie a "cancelado"';
  RAISE NOTICE '🔧 Acciones: liberar vehículo, cancelar turno, resetear asignaciones, registrar auditoría';
END $$;
