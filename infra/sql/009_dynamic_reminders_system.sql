-- ======================================================
-- SISTEMA DINÁMICO DE RECORDATORIOS DE MANTENIMIENTO
-- ======================================================

-- Función mejorada para crear recordatorios dinámicamente
CREATE OR REPLACE FUNCTION refresh_dynamic_reminders()
RETURNS VOID AS $$
DECLARE
    task_record RECORD;
    reminder_exists BOOLEAN;
BEGIN
    -- Limpiar recordatorios antiguos que ya no son válidos
    DELETE FROM maintenance_reminders 
    WHERE is_active = TRUE 
      AND maintenance_task_id IN (
          SELECT id FROM maintenance_tasks 
          WHERE status = 'completed' OR status = 'cancelled'
      );
    
    -- Generar recordatorios para tareas vencidas
    FOR task_record IN 
        SELECT mt.id, mt.asset_id, mt.title, mt.due_date, mt.priority, a.name as asset_name
        FROM maintenance_tasks mt
        JOIN assets a ON mt.asset_id = a.id
        WHERE mt.status = 'pending' 
          AND mt.due_date IS NOT NULL
          AND mt.due_date < CURRENT_TIMESTAMP
    LOOP
        -- Verificar si ya existe un recordatorio activo para esta tarea
        SELECT EXISTS(
            SELECT 1 FROM maintenance_reminders 
            WHERE maintenance_task_id = task_record.id 
              AND reminder_type = 'overdue'
              AND is_active = TRUE
        ) INTO reminder_exists;
        
        -- Solo crear si no existe
        IF NOT reminder_exists THEN
            INSERT INTO maintenance_reminders (
                asset_id, maintenance_task_id, reminder_type, priority,
                title, message, due_date, days_before_due, is_active
            ) VALUES (
                task_record.asset_id,
                task_record.id,
                'overdue',
                CASE 
                    WHEN task_record.priority = 'critical' THEN 'critical'
                    WHEN task_record.priority = 'high' THEN 'high'
                    ELSE 'medium'
                END,
                'Mantenimiento vencido! - ' || task_record.asset_name,
                'El mantenimiento "' || task_record.title || '" esta vencido desde ' || 
                EXTRACT(days FROM CURRENT_TIMESTAMP - task_record.due_date) || ' dias.',
                task_record.due_date,
                0,
                TRUE
            );
        ELSE
            -- Actualizar mensaje con días vencidos actualizados
            UPDATE maintenance_reminders 
            SET message = 'El mantenimiento "' || task_record.title || '" esta vencido desde ' || 
                         EXTRACT(days FROM CURRENT_TIMESTAMP - task_record.due_date) || ' dias.',
                priority = CASE 
                    WHEN EXTRACT(days FROM CURRENT_TIMESTAMP - task_record.due_date) > 30 THEN 'critical'
                    WHEN EXTRACT(days FROM CURRENT_TIMESTAMP - task_record.due_date) > 7 THEN 'high'
                    ELSE 'medium'
                END
            WHERE maintenance_task_id = task_record.id 
              AND reminder_type = 'overdue'
              AND is_active = TRUE;
        END IF;
    END LOOP;
    
    -- Generar recordatorios para tareas próximas a vencer (próximos 7 días)
    FOR task_record IN 
        SELECT mt.id, mt.asset_id, mt.title, mt.due_date, mt.priority, a.name as asset_name
        FROM maintenance_tasks mt
        JOIN assets a ON mt.asset_id = a.id
        WHERE mt.status = 'pending' 
          AND mt.due_date IS NOT NULL
          AND mt.due_date > CURRENT_TIMESTAMP
          AND mt.due_date <= (CURRENT_TIMESTAMP + INTERVAL '7 days')
    LOOP
        -- Verificar si ya existe un recordatorio activo para esta tarea
        SELECT EXISTS(
            SELECT 1 FROM maintenance_reminders 
            WHERE maintenance_task_id = task_record.id 
              AND reminder_type = 'due_soon'
              AND is_active = TRUE
        ) INTO reminder_exists;
        
        -- Solo crear si no existe
        IF NOT reminder_exists THEN
            INSERT INTO maintenance_reminders (
                asset_id, maintenance_task_id, reminder_type, priority,
                title, message, due_date, days_before_due, is_active
            ) VALUES (
                task_record.asset_id,
                task_record.id,
                'due_soon',
                CASE 
                    WHEN EXTRACT(days FROM task_record.due_date - CURRENT_TIMESTAMP) <= 1 THEN 'high'
                    WHEN EXTRACT(days FROM task_record.due_date - CURRENT_TIMESTAMP) <= 3 THEN 'medium'
                    ELSE 'low'
                END,
                'Mantenimiento proximo - ' || task_record.asset_name,
                'El mantenimiento "' || task_record.title || '" esta programado para dentro de ' || 
                EXTRACT(days FROM task_record.due_date - CURRENT_TIMESTAMP) || ' dias.',
                task_record.due_date,
                EXTRACT(days FROM task_record.due_date - CURRENT_TIMESTAMP)::INTEGER,
                TRUE
            );
        ELSE
            -- Actualizar mensaje con días restantes actualizados
            UPDATE maintenance_reminders 
            SET message = 'El mantenimiento "' || task_record.title || '" esta programado para dentro de ' || 
                         EXTRACT(days FROM task_record.due_date - CURRENT_TIMESTAMP) || ' dias.',
                days_before_due = EXTRACT(days FROM task_record.due_date - CURRENT_TIMESTAMP)::INTEGER,
                priority = CASE 
                    WHEN EXTRACT(days FROM task_record.due_date - CURRENT_TIMESTAMP) <= 1 THEN 'high'
                    WHEN EXTRACT(days FROM task_record.due_date - CURRENT_TIMESTAMP) <= 3 THEN 'medium'
                    ELSE 'low'
                END
            WHERE maintenance_task_id = task_record.id 
              AND reminder_type = 'due_soon'
              AND is_active = TRUE;
        END IF;
    END LOOP;
    
    -- Limpiar recordatorios de "due_soon" que ya no aplican
    DELETE FROM maintenance_reminders 
    WHERE reminder_type = 'due_soon'
      AND is_active = TRUE
      AND maintenance_task_id IN (
          SELECT id FROM maintenance_tasks 
          WHERE due_date IS NULL 
             OR due_date <= CURRENT_TIMESTAMP 
             OR due_date > (CURRENT_TIMESTAMP + INTERVAL '7 days')
      );
      
END;
$$ LANGUAGE 'plpgsql';

-- Función para obtener estadísticas dinámicas de recordatorios
CREATE OR REPLACE FUNCTION get_dynamic_reminder_stats()
RETURNS TABLE(
    total_active INTEGER,
    overdue INTEGER,
    due_soon INTEGER,
    critical_priority INTEGER
) AS $$
BEGIN
    -- Actualizar recordatorios primero
    PERFORM refresh_dynamic_reminders();
    
    -- Retornar estadísticas actualizadas
    RETURN QUERY
    SELECT 
        (SELECT COUNT(*)::INTEGER FROM maintenance_reminders WHERE is_active = TRUE) as total_active,
        (SELECT COUNT(*)::INTEGER FROM maintenance_reminders WHERE is_active = TRUE AND reminder_type = 'overdue') as overdue,
        (SELECT COUNT(*)::INTEGER FROM maintenance_reminders WHERE is_active = TRUE AND reminder_type = 'due_soon') as due_soon,
        (SELECT COUNT(*)::INTEGER FROM maintenance_reminders WHERE is_active = TRUE AND priority = 'critical') as critical_priority;
END;
$$ LANGUAGE 'plpgsql';

-- Función para obtener recordatorios dinámicos
CREATE OR REPLACE FUNCTION get_dynamic_reminders()
RETURNS TABLE(
    id UUID,
    asset_id INTEGER,
    maintenance_task_id UUID,
    reminder_type VARCHAR(50),
    priority VARCHAR(20),
    title VARCHAR(200),
    message TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    due_date TIMESTAMP WITH TIME ZONE,
    reminded_at TIMESTAMP WITH TIME ZONE,
    dismissed_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN,
    is_dismissed BOOLEAN,
    days_before_due INTEGER,
    asset_name VARCHAR(255),
    task_status VARCHAR(50)
) AS $$
BEGIN
    -- Actualizar recordatorios primero
    PERFORM refresh_dynamic_reminders();
    
    -- Retornar recordatorios actualizados con información del asset y tarea
    RETURN QUERY
    SELECT 
        mr.id,
        mr.asset_id,
        mr.maintenance_task_id,
        mr.reminder_type,
        mr.priority,
        mr.title,
        mr.message,
        mr.created_at,
        mr.due_date,
        mr.reminded_at,
        mr.dismissed_at,
        mr.is_active,
        mr.is_dismissed,
        mr.days_before_due,
        a.name as asset_name,
        mt.status as task_status
    FROM maintenance_reminders mr
    JOIN assets a ON mr.asset_id = a.id
    JOIN maintenance_tasks mt ON mr.maintenance_task_id = mt.id
    WHERE mr.is_active = TRUE
    ORDER BY 
        CASE mr.priority 
            WHEN 'critical' THEN 1
            WHEN 'high' THEN 2
            WHEN 'medium' THEN 3
            WHEN 'low' THEN 4
            ELSE 5
        END,
        mr.due_date ASC;
END;
$$ LANGUAGE 'plpgsql';

-- Trigger para actualizar recordatorios cuando se modifica una tarea
CREATE OR REPLACE FUNCTION trigger_refresh_reminders()
RETURNS TRIGGER AS $$
BEGIN
    -- Solo actualizar si cambió el estado o la fecha de vencimiento
    IF TG_OP = 'UPDATE' THEN
        IF OLD.status != NEW.status OR OLD.due_date != NEW.due_date THEN
            PERFORM refresh_dynamic_reminders();
        END IF;
    ELSIF TG_OP = 'INSERT' THEN
        PERFORM refresh_dynamic_reminders();
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE 'plpgsql';

-- Aplicar trigger para actualizar recordatorios automáticamente (con manejo de excepciones)
DO $$
BEGIN
    DROP TRIGGER IF EXISTS auto_refresh_reminders_trigger ON maintenance_tasks;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Drop trigger skipped: %', SQLERRM;
END $$;

DO $$
BEGIN
    CREATE TRIGGER auto_refresh_reminders_trigger
        AFTER INSERT OR UPDATE ON maintenance_tasks
        FOR EACH ROW EXECUTE FUNCTION trigger_refresh_reminders();
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Create trigger skipped: %', SQLERRM;
END $$;

-- Ejecutar actualización inicial (con manejo de excepciones)
DO $$
BEGIN
    SELECT refresh_dynamic_reminders();
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Function execution skipped: %', SQLERRM;
END $$;

COMMIT;