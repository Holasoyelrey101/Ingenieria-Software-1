-- ======================================================
-- HU8 - SISTEMA DE RECORDATORIOS DE MANTENIMIENTO
-- ======================================================

-- Tabla de Recordatorios de Mantenimiento
CREATE TABLE IF NOT EXISTS maintenance_reminders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id INTEGER REFERENCES assets(id) ON DELETE CASCADE,
    maintenance_task_id UUID REFERENCES maintenance_tasks(id) ON DELETE CASCADE,
    reminder_type VARCHAR(50) NOT NULL CHECK (reminder_type IN ('due_soon', 'overdue', 'scheduled', 'critical')),
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    
    -- Mensaje del recordatorio
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    
    -- Fechas
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    due_date TIMESTAMP WITH TIME ZONE NOT NULL,
    reminded_at TIMESTAMP WITH TIME ZONE,
    dismissed_at TIMESTAMP WITH TIME ZONE,
    
    -- Estado
    is_active BOOLEAN DEFAULT TRUE,
    is_dismissed BOOLEAN DEFAULT FALSE,
    
    -- Configuracion del recordatorio
    days_before_due INTEGER DEFAULT 7,
    
    -- Metadata
    reminder_metadata JSONB
);

-- Indices para optimizacion de recordatorios
CREATE INDEX IF NOT EXISTS idx_maintenance_reminders_asset_id ON maintenance_reminders(asset_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_reminders_task_id ON maintenance_reminders(maintenance_task_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_reminders_type ON maintenance_reminders(reminder_type);
CREATE INDEX IF NOT EXISTS idx_maintenance_reminders_priority ON maintenance_reminders(priority);
CREATE INDEX IF NOT EXISTS idx_maintenance_reminders_due_date ON maintenance_reminders(due_date);
CREATE INDEX IF NOT EXISTS idx_maintenance_reminders_active ON maintenance_reminders(is_active, is_dismissed);

-- Funcion para crear recordatorios automaticamente
CREATE OR REPLACE FUNCTION create_maintenance_reminders()
RETURNS TRIGGER AS $$
BEGIN
    -- Crear recordatorio cuando se crea una tarea nueva
    IF TG_OP = 'INSERT' AND NEW.due_date IS NOT NULL THEN
        -- Recordatorio 7 dias antes
        INSERT INTO maintenance_reminders (
            asset_id, maintenance_task_id, reminder_type, priority,
            title, message, due_date, days_before_due
        ) VALUES (
            NEW.asset_id, 
            NEW.id, 
            'due_soon', 
            CASE 
                WHEN NEW.priority = 'critical' THEN 'high'
                WHEN NEW.priority = 'high' THEN 'medium'
                ELSE 'low'
            END,
            'Mantenimiento proximo - ' || (SELECT name FROM assets WHERE id = NEW.asset_id),
            'El mantenimiento "' || NEW.title || '" esta programado para dentro de 7 dias.',
            NEW.due_date - INTERVAL '7 days',
            7
        );
        
        -- Recordatorio 1 dia antes para tareas criticas
        IF NEW.priority IN ('critical', 'high') THEN
            INSERT INTO maintenance_reminders (
                asset_id, maintenance_task_id, reminder_type, priority,
                title, message, due_date, days_before_due
            ) VALUES (
                NEW.asset_id, 
                NEW.id, 
                'due_soon', 
                'high',
                'Mantenimiento urgente - ' || (SELECT name FROM assets WHERE id = NEW.asset_id),
                'El mantenimiento critico "' || NEW.title || '" esta programado para manana.',
                NEW.due_date - INTERVAL '1 day',
                1
            );
        END IF;
        
        RETURN NEW;
    END IF;
    
    -- Actualizar recordatorios cuando cambia el estado de la tarea
    IF TG_OP = 'UPDATE' THEN
        -- Si la tarea se completa, marcar recordatorios como inactivos
        IF OLD.status != 'completed' AND NEW.status = 'completed' THEN
            UPDATE maintenance_reminders 
            SET is_active = FALSE, dismissed_at = CURRENT_TIMESTAMP
            WHERE maintenance_task_id = NEW.id AND is_active = TRUE;
        END IF;
        
        -- Si la fecha de vencimiento cambia, actualizar recordatorios
        IF OLD.due_date != NEW.due_date AND NEW.due_date IS NOT NULL THEN
            UPDATE maintenance_reminders 
            SET due_date = NEW.due_date - (days_before_due || ' days')::INTERVAL
            WHERE maintenance_task_id = NEW.id AND is_active = TRUE;
        END IF;
        
        RETURN NEW;
    END IF;
    
    RETURN NULL;
END;
$$ language 'plpgsql';

-- Aplicar trigger para crear recordatorios automaticamente
CREATE TRIGGER maintenance_reminders_trigger
    AFTER INSERT OR UPDATE ON maintenance_tasks
    FOR EACH ROW EXECUTE FUNCTION create_maintenance_reminders();

-- Funcion para identificar tareas vencidas y crear recordatorios
CREATE OR REPLACE FUNCTION create_overdue_reminders()
RETURNS VOID AS $$
DECLARE
    overdue_task RECORD;
BEGIN
    -- Buscar tareas vencidas sin recordatorio de vencimiento
    FOR overdue_task IN 
        SELECT mt.id, mt.asset_id, mt.title, mt.due_date, mt.priority, a.name as asset_name
        FROM maintenance_tasks mt
        JOIN assets a ON mt.asset_id = a.id
        WHERE mt.status = 'pending' 
          AND mt.due_date < CURRENT_TIMESTAMP
          AND NOT EXISTS (
              SELECT 1 FROM maintenance_reminders mr 
              WHERE mr.maintenance_task_id = mt.id 
                AND mr.reminder_type = 'overdue'
                AND mr.is_active = TRUE
          )
    LOOP
        -- Crear recordatorio de vencimiento
        INSERT INTO maintenance_reminders (
            asset_id, maintenance_task_id, reminder_type, priority,
            title, message, due_date, days_before_due
        ) VALUES (
            overdue_task.asset_id,
            overdue_task.id,
            'overdue',
            CASE 
                WHEN overdue_task.priority = 'critical' THEN 'critical'
                WHEN overdue_task.priority = 'high' THEN 'high'
                ELSE 'medium'
            END,
            'Mantenimiento vencido! - ' || overdue_task.asset_name,
            'El mantenimiento "' || overdue_task.title || '" esta vencido desde ' || 
            EXTRACT(days FROM CURRENT_TIMESTAMP - overdue_task.due_date) || ' dias.',
            overdue_task.due_date,
            0
        );
    END LOOP;
END;
$$ language 'plpgsql';

-- Crear algunos recordatorios iniciales para las tareas existentes (con manejo de excepciones)
DO $$
BEGIN
    SELECT create_overdue_reminders();
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Create overdue reminders skipped: %', SQLERRM;
END $$;

COMMIT;