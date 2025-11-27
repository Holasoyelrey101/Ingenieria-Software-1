-- ============================================================================
-- 018_fix_cascade_delete.sql
-- Arregla la eliminación en cascada entre dynamic_shifts y shift_assignments
-- Previene bucles infinitos
-- ============================================================================

-- ============================================================================
-- PARTE 1: Función para eliminar shift_assignment cuando se borra dynamic_shift
-- ============================================================================
CREATE OR REPLACE FUNCTION delete_calendar_on_dynamic_delete()
RETURNS TRIGGER AS $$
DECLARE
    v_employee_id INT;
BEGIN
    -- Obtener el employee_id del dynamic_shift eliminado
    SELECT dsa.employee_id INTO v_employee_id
    FROM dynamic_shift_assignments dsa
    WHERE dsa.dynamic_shift_id = OLD.id
    LIMIT 1;

    -- Si existe asignación, eliminar del calendario
    IF v_employee_id IS NOT NULL THEN
        -- Eliminar SOLO si tiene notes con 'Ruta #'
        DELETE FROM shift_assignments
        WHERE employee_id = v_employee_id
          AND date = OLD.fecha_programada
          AND notes LIKE CONCAT('Ruta #', COALESCE(OLD.route_id::TEXT, '%'));
        
        RAISE NOTICE 'Eliminado calendario para empleado % en fecha %', v_employee_id, OLD.fecha_programada;
    END IF;

    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Trigger en dynamic_shifts (DELETE)
DROP TRIGGER IF EXISTS trigger_delete_calendar_on_dynamic_delete ON dynamic_shifts;
CREATE TRIGGER trigger_delete_calendar_on_dynamic_delete
AFTER DELETE ON dynamic_shifts
FOR EACH ROW
EXECUTE FUNCTION delete_calendar_on_dynamic_delete();

-- ============================================================================
-- PARTE 2: Función para eliminar dynamic_shift cuando se borra shift_assignment
-- ============================================================================
CREATE OR REPLACE FUNCTION delete_dynamic_on_calendar_delete()
RETURNS TRIGGER AS $$
BEGIN
    -- SOLO eliminar si el turno tiene notes de 'Ruta #'
    IF OLD.notes LIKE 'Ruta #%' THEN
        -- Eliminar dynamic_shift usando fecha y employee_id
        -- IMPORTANTE: Este DELETE activará el trigger de la Parte 1, pero ese trigger
        -- NO volverá a eliminar porque OLD ya no existe (es AFTER DELETE)
        DELETE FROM dynamic_shifts ds
        WHERE ds.fecha_programada = OLD.date
          AND EXISTS (
              SELECT 1 FROM dynamic_shift_assignments dsa
              WHERE dsa.dynamic_shift_id = ds.id
                AND dsa.employee_id = OLD.employee_id
          );
        
        RAISE NOTICE 'Eliminado dynamic_shift para empleado % en fecha %', OLD.employee_id, OLD.date;
    END IF;

    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Trigger en shift_assignments (DELETE)
DROP TRIGGER IF EXISTS trigger_delete_dynamic_on_calendar_delete ON shift_assignments;
CREATE TRIGGER trigger_delete_dynamic_on_calendar_delete
BEFORE DELETE ON shift_assignments
FOR EACH ROW
EXECUTE FUNCTION delete_dynamic_on_calendar_delete();

-- ============================================================================
-- VERIFICACIÓN
-- ============================================================================
\echo '✅ Triggers de eliminación en cascada recreados (sin bucles)'
