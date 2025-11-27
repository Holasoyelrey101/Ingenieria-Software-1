-- =============================================================================
-- SINCRONIZACIÓN: Turnos Manuales (Calendario) → Turnos Dinámicos (Conductores)
-- =============================================================================
-- Objetivo: Cuando se crea un turno manual en el Calendario de Turnos,
-- automáticamente crear un dynamic_shift para que aparezca en "Turnos de Conductores"

-- Función que sincroniza shift_assignments → dynamic_shifts
CREATE OR REPLACE FUNCTION sync_manual_shift_to_dynamic()
RETURNS TRIGGER AS $$
DECLARE
    v_shift_type VARCHAR(50);
    v_start_time TIME;
    v_end_time TIME;
    v_duration_minutes INTEGER;
    v_existing_dynamic_shift_id INTEGER;
BEGIN
    -- Obtener detalles del shift
    SELECT tipo, start_time, end_time
    INTO v_shift_type, v_start_time, v_end_time
    FROM shifts
    WHERE id = NEW.shift_id;
    
    -- Calcular duración en minutos
    v_duration_minutes := EXTRACT(EPOCH FROM (v_end_time - v_start_time)) / 60;
    
    -- Verificar si ya existe un dynamic_shift para este empleado en esta fecha/hora
    SELECT id INTO v_existing_dynamic_shift_id
    FROM dynamic_shifts ds
    WHERE ds.fecha_programada = NEW.date
      AND ds.hora_inicio = v_start_time
      AND EXISTS (
          SELECT 1 FROM dynamic_shift_assignments dsa
          WHERE dsa.dynamic_shift_id = ds.id
            AND dsa.employee_id = NEW.employee_id
      );
    
    IF v_existing_dynamic_shift_id IS NULL THEN
        -- Crear nuevo dynamic_shift
        INSERT INTO dynamic_shifts (
            route_id,
            fecha_programada,
            hora_inicio,
            duracion_minutos,
            conduccion_continua_minutos,
            status,
            created_at
        ) VALUES (
            NULL,  -- Sin ruta asociada (turno manual)
            NEW.date,
            v_start_time,
            v_duration_minutes,
            v_duration_minutes,  -- Igual a duración total
            'asignado',  -- Ya está asignado desde el calendario
            NOW()
        ) RETURNING id INTO v_existing_dynamic_shift_id;
        
        -- Asignar empleado al dynamic_shift
        INSERT INTO dynamic_shift_assignments (
            dynamic_shift_id,
            employee_id,
            role_in_shift,
            status
        ) VALUES (
            v_existing_dynamic_shift_id,
            NEW.employee_id,
            CASE 
                WHEN v_shift_type = 'Mañana' THEN 'Conductor Turno Mañana'
                WHEN v_shift_type = 'Tarde' THEN 'Conductor Turno Tarde'
                WHEN v_shift_type = 'Noche' THEN 'Conductor Turno Noche'
                ELSE 'Conductor'
            END,
            'asignado'
        );
        
        RAISE NOTICE 'Turno manual sincronizado: employee_id=%, dynamic_shift_id=%', 
                     NEW.employee_id, v_existing_dynamic_shift_id;
    ELSE
        RAISE NOTICE 'Dynamic shift ya existe para este turno: id=%', v_existing_dynamic_shift_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger que se dispara al crear shift_assignment
DROP TRIGGER IF EXISTS trigger_sync_manual_shift ON shift_assignments;
CREATE TRIGGER trigger_sync_manual_shift
    AFTER INSERT ON shift_assignments
    FOR EACH ROW
    EXECUTE FUNCTION sync_manual_shift_to_dynamic();

-- =============================================================================
-- Sincronizar turnos existentes (ejecutar una vez)
-- =============================================================================

DO $$
DECLARE
    sa_record RECORD;
    v_shift_type VARCHAR(50);
    v_start_time TIME;
    v_end_time TIME;
    v_duration_minutes INTEGER;
    v_dynamic_shift_id INTEGER;
BEGIN
    FOR sa_record IN 
        SELECT sa.id, sa.employee_id, sa.shift_id, sa.date
        FROM shift_assignments sa
        ORDER BY sa.id
    LOOP
        -- Obtener detalles del shift
        SELECT tipo, start_time, end_time
        INTO v_shift_type, v_start_time, v_end_time
        FROM shifts
        WHERE id = sa_record.shift_id;
        
        -- Calcular duración
        v_duration_minutes := EXTRACT(EPOCH FROM (v_end_time - v_start_time)) / 60;
        
        -- Verificar si ya existe
        SELECT id INTO v_dynamic_shift_id
        FROM dynamic_shifts ds
        WHERE ds.fecha_programada = sa_record.date
          AND ds.hora_inicio = v_start_time
          AND EXISTS (
              SELECT 1 FROM dynamic_shift_assignments dsa
              WHERE dsa.dynamic_shift_id = ds.id
                AND dsa.employee_id = sa_record.employee_id
          );
        
        IF v_dynamic_shift_id IS NULL THEN
            -- Crear dynamic_shift
            INSERT INTO dynamic_shifts (
                route_id,
                fecha_programada,
                hora_inicio,
                duracion_minutos,
                conduccion_continua_minutos,
                status,
                created_at
            ) VALUES (
                NULL,
                sa_record.date,
                v_start_time,
                v_duration_minutes,
                v_duration_minutes,
                'asignado',
                NOW()
            ) RETURNING id INTO v_dynamic_shift_id;
            
            -- Asignar empleado
            INSERT INTO dynamic_shift_assignments (
                dynamic_shift_id,
                employee_id,
                role_in_shift,
                status
            ) VALUES (
                v_dynamic_shift_id,
                sa_record.employee_id,
                CASE 
                    WHEN v_shift_type = 'Mañana' THEN 'Conductor Turno Mañana'
                    WHEN v_shift_type = 'Tarde' THEN 'Conductor Turno Tarde'
                    WHEN v_shift_type = 'Noche' THEN 'Conductor Turno Noche'
                    ELSE 'Conductor'
                END,
                'asignado'
            );
            
            RAISE NOTICE 'Sincronizado turno existente: employee_id=%, date=%, dynamic_shift_id=%',
                         sa_record.employee_id, sa_record.date, v_dynamic_shift_id;
        END IF;
    END LOOP;
END $$;

COMMIT;
