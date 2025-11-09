-- ======================================================
-- SISTEMA DE MANTENIMIENTO - BASE DE DATOS ROBUSTA
-- Creado para HU7 - Registrar mantenciones preventivas
-- ======================================================

-- Tabla de Categorías de Activos
CREATE TABLE IF NOT EXISTS asset_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    color_code VARCHAR(7) DEFAULT '#3B82F6', -- Para UI
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de Tipos de Vehículos/Equipos
CREATE TABLE IF NOT EXISTS vehicle_types (
    id SERIAL PRIMARY KEY,
    category_id INTEGER REFERENCES asset_categories(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    default_maintenance_interval INTEGER DEFAULT 30, -- días
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de Marcas
CREATE TABLE IF NOT EXISTS brands (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    country VARCHAR(50),
    website VARCHAR(255),
    support_phone VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de Modelos
CREATE TABLE IF NOT EXISTS vehicle_models (
    id SERIAL PRIMARY KEY,
    brand_id INTEGER REFERENCES brands(id) ON DELETE CASCADE,
    vehicle_type_id INTEGER REFERENCES vehicle_types(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    year_from INTEGER,
    year_to INTEGER,
    engine_type VARCHAR(50),
    fuel_type VARCHAR(30),
    specifications JSONB, -- Para almacenar specs técnicas flexibles
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabla Principal de Activos (Mejorada)
CREATE TABLE IF NOT EXISTS assets (
    id SERIAL PRIMARY KEY,
    asset_code VARCHAR(50) UNIQUE NOT NULL, -- Código único del activo
    name VARCHAR(150) NOT NULL,
    vehicle_model_id INTEGER REFERENCES vehicle_models(id),
    serial_number VARCHAR(100),
    license_plate VARCHAR(20), -- Para vehículos
    vin_number VARCHAR(30), -- Vehicle Identification Number
    location VARCHAR(200),
    status VARCHAR(30) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'maintenance', 'retired', 'repair')),
    acquisition_date DATE,
    warranty_end_date DATE,
    purchase_price DECIMAL(12,2),
    current_value DECIMAL(12,2),
    mileage INTEGER DEFAULT 0, -- Kilometraje actual
    engine_hours INTEGER DEFAULT 0, -- Horas de motor
    last_inspection_date DATE,
    next_inspection_date DATE,
    insurance_policy VARCHAR(100),
    insurance_expiry DATE,
    notes TEXT,
    asset_metadata JSONB, -- Para datos adicionales flexibles
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de Personal de Mantenimiento
CREATE TABLE IF NOT EXISTS maintenance_personnel (
    id SERIAL PRIMARY KEY,
    employee_code VARCHAR(50) UNIQUE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE,
    phone VARCHAR(20),
    specializations TEXT[], -- Array de especializaciones
    certification_level VARCHAR(20) DEFAULT 'basic' CHECK (certification_level IN ('basic', 'intermediate', 'advanced', 'expert')),
    hire_date DATE,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'vacation', 'sick_leave')),
    hourly_rate DECIMAL(8,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de Tipos de Mantenimiento
CREATE TABLE IF NOT EXISTS maintenance_types (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    category VARCHAR(30) NOT NULL CHECK (category IN ('preventive', 'corrective', 'predictive', 'emergency')),
    description TEXT,
    estimated_duration INTEGER, -- en horas
    frequency_days INTEGER, -- cada cuántos días se debe realizar
    priority_level INTEGER DEFAULT 3 CHECK (priority_level BETWEEN 1 AND 5),
    cost_estimate DECIMAL(10,2),
    required_certifications TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabla Principal de Tareas de Mantenimiento (Mejorada)
CREATE TABLE IF NOT EXISTS maintenance_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_code VARCHAR(50) UNIQUE NOT NULL,
    asset_id INTEGER REFERENCES assets(id) ON DELETE CASCADE,
    maintenance_type_id INTEGER REFERENCES maintenance_types(id),
    assigned_to INTEGER REFERENCES maintenance_personnel(id),
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    status VARCHAR(30) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled', 'overdue')),
    
    -- Fechas y tiempo
    scheduled_date TIMESTAMP WITH TIME ZONE,
    due_date TIMESTAMP WITH TIME ZONE,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    estimated_duration INTEGER, -- horas estimadas
    actual_duration INTEGER, -- horas reales
    
    -- Información de costos
    estimated_cost DECIMAL(10,2),
    actual_cost DECIMAL(10,2),
    labor_cost DECIMAL(10,2),
    parts_cost DECIMAL(10,2),
    
    -- Estado del vehículo
    mileage_at_service INTEGER,
    engine_hours_at_service INTEGER,
    
    -- Documentación
    work_order_number VARCHAR(50),
    completion_notes TEXT,
    quality_rating INTEGER CHECK (quality_rating BETWEEN 1 AND 5),
    customer_satisfaction INTEGER CHECK (customer_satisfaction BETWEEN 1 AND 5),
    
    -- Metadata
    task_metadata JSONB,
    attachments TEXT[], -- URLs de documentos/fotos
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de Partes/Repuestos
CREATE TABLE IF NOT EXISTS maintenance_parts (
    id SERIAL PRIMARY KEY,
    part_number VARCHAR(100) NOT NULL,
    name VARCHAR(200) NOT NULL,
    brand_id INTEGER REFERENCES brands(id),
    category VARCHAR(100),
    description TEXT,
    unit_price DECIMAL(10,2),
    stock_quantity INTEGER DEFAULT 0,
    minimum_stock INTEGER DEFAULT 0,
    supplier_info JSONB,
    compatibility JSONB, -- Modelos compatibles
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de Partes utilizadas en mantenimientos
CREATE TABLE IF NOT EXISTS maintenance_task_parts (
    id SERIAL PRIMARY KEY,
    maintenance_task_id UUID REFERENCES maintenance_tasks(id) ON DELETE CASCADE,
    part_id INTEGER REFERENCES maintenance_parts(id),
    quantity_used INTEGER NOT NULL,
    unit_cost DECIMAL(10,2),
    total_cost DECIMAL(10,2),
    notes TEXT
);

-- Tabla de Historial de Mantenimiento
CREATE TABLE IF NOT EXISTS maintenance_history (
    id SERIAL PRIMARY KEY,
    asset_id INTEGER REFERENCES assets(id) ON DELETE CASCADE,
    maintenance_task_id UUID REFERENCES maintenance_tasks(id),
    action_type VARCHAR(50) NOT NULL, -- 'created', 'started', 'completed', 'cancelled'
    performed_by INTEGER REFERENCES maintenance_personnel(id),
    action_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    history_metadata JSONB
);

-- Tabla de Checklists de Mantenimiento
CREATE TABLE IF NOT EXISTS maintenance_checklists (
    id SERIAL PRIMARY KEY,
    maintenance_type_id INTEGER REFERENCES maintenance_types(id),
    name VARCHAR(200) NOT NULL,
    checklist_items JSONB NOT NULL, -- Array de items del checklist
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de Resultados de Checklists
CREATE TABLE IF NOT EXISTS maintenance_checklist_results (
    id SERIAL PRIMARY KEY,
    maintenance_task_id UUID REFERENCES maintenance_tasks(id) ON DELETE CASCADE,
    checklist_id INTEGER REFERENCES maintenance_checklists(id),
    results JSONB NOT NULL, -- Resultados del checklist
    completed_by INTEGER REFERENCES maintenance_personnel(id),
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ======================================================
-- ÍNDICES PARA OPTIMIZACIÓN
-- ======================================================

-- Índices para búsquedas frecuentes
CREATE INDEX IF NOT EXISTS idx_assets_status ON assets(status);
CREATE INDEX IF NOT EXISTS idx_assets_location ON assets(location);
CREATE INDEX IF NOT EXISTS idx_maintenance_tasks_status ON maintenance_tasks(status);
CREATE INDEX IF NOT EXISTS idx_maintenance_tasks_priority ON maintenance_tasks(priority);
CREATE INDEX IF NOT EXISTS idx_maintenance_tasks_assigned_to ON maintenance_tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_maintenance_tasks_asset_id ON maintenance_tasks(asset_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_tasks_scheduled_date ON maintenance_tasks(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_maintenance_tasks_due_date ON maintenance_tasks(due_date);

-- Índices compuestos para consultas complejas
CREATE INDEX IF NOT EXISTS idx_maintenance_tasks_status_priority ON maintenance_tasks(status, priority);
CREATE INDEX IF NOT EXISTS idx_maintenance_tasks_asset_status ON maintenance_tasks(asset_id, status);

-- ======================================================
-- TRIGGERS PARA AUTOMATIZACIÓN
-- ======================================================

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Aplicar trigger a las tablas principales
CREATE TRIGGER update_assets_updated_at BEFORE UPDATE ON assets 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_maintenance_tasks_updated_at BEFORE UPDATE ON maintenance_tasks 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Función para generar códigos únicos
CREATE OR REPLACE FUNCTION generate_asset_code()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.asset_code IS NULL THEN
        NEW.asset_code := 'AST-' || LPAD(NEW.id::text, 6, '0');
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Función para generar códigos de tareas (COMENTADA para evitar duplicados)
-- CREATE OR REPLACE FUNCTION generate_task_code()
-- RETURNS TRIGGER AS $$
-- BEGIN
--     IF NEW.task_code IS NULL THEN
--         NEW.task_code := 'MT-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || LPAD(extract(epoch from now())::bigint::text, 10, '0');
--     END IF;
--     RETURN NEW;
-- END;
-- $$ language 'plpgsql';

-- Aplicar triggers para códigos únicos
CREATE TRIGGER generate_asset_code_trigger BEFORE INSERT ON assets 
    FOR EACH ROW EXECUTE FUNCTION generate_asset_code();

-- Trigger de task_code comentado para evitar duplicados
-- CREATE TRIGGER generate_task_code_trigger BEFORE INSERT ON maintenance_tasks 
--     FOR EACH ROW EXECUTE FUNCTION generate_task_code();

-- Función para crear historial automáticamente
CREATE OR REPLACE FUNCTION create_maintenance_history()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO maintenance_history (asset_id, maintenance_task_id, action_type, notes)
        VALUES (NEW.asset_id, NEW.id, 'created', 'Tarea de mantenimiento creada');
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        -- Si cambió el estado, registrar en historial
        IF OLD.status != NEW.status THEN
            INSERT INTO maintenance_history (asset_id, maintenance_task_id, action_type, notes)
            VALUES (NEW.asset_id, NEW.id, 'status_changed', 'Estado cambiado de ' || OLD.status || ' a ' || NEW.status);
        END IF;
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ language 'plpgsql';

CREATE TRIGGER maintenance_history_trigger
    AFTER INSERT OR UPDATE ON maintenance_tasks
    FOR EACH ROW EXECUTE FUNCTION create_maintenance_history();

-- ======================================================
-- DATOS INICIALES (SEED DATA)
-- ======================================================

-- Categorías de activos
INSERT INTO asset_categories (name, description, color_code) VALUES
('Vehiculos de Carga', 'Camiones, furgones y vehiculos de transporte', '#EF4444'),
('Maquinaria Pesada', 'Gruas, excavadoras, cargadores', '#F97316'),
('Equipos de Bodega', 'Carretillas, montacargas, equipos de almacen', '#EAB308'),
('Vehiculos de Servicio', 'Vehiculos administrativos y de servicios', '#22C55E'),
('Herramientas Especializadas', 'Equipos especializados y herramientas', '#6366F1')
ON CONFLICT (name) DO NOTHING;

-- Marcas principales
INSERT INTO brands (name, country, website) VALUES
('Volvo', 'Suecia', 'https://www.volvo.com'),
('Mercedes-Benz', 'Alemania', 'https://www.mercedes-benz.com'),
('Scania', 'Suecia', 'https://www.scania.com'),
('MAN', 'Alemania', 'https://www.man.eu'),
('DAF', 'Paises Bajos', 'https://www.daf.com'),
('Iveco', 'Italia', 'https://www.iveco.com'),
('Liebherr', 'Alemania', 'https://www.liebherr.com'),
('Caterpillar', 'Estados Unidos', 'https://www.caterpillar.com'),
('Komatsu', 'Japon', 'https://www.komatsu.com'),
('Clark', 'Estados Unidos', 'https://www.clarkmhc.com')
ON CONFLICT (name) DO NOTHING;

-- Tipos de vehículos
INSERT INTO vehicle_types (category_id, name, description, default_maintenance_interval) VALUES
((SELECT id FROM asset_categories WHERE name = 'Vehiculos de Carga'), 'Camion Pesado', 'Camiones de carga superior a 12 toneladas', 15),
((SELECT id FROM asset_categories WHERE name = 'Vehiculos de Carga'), 'Camion Mediano', 'Camiones de carga entre 3.5 y 12 toneladas', 20),
((SELECT id FROM asset_categories WHERE name = 'Vehiculos de Carga'), 'Furgon', 'Vehiculos de reparto urbano', 25),
((SELECT id FROM asset_categories WHERE name = 'Maquinaria Pesada'), 'Grua Movil', 'Gruas autopropulsadas', 30),
((SELECT id FROM asset_categories WHERE name = 'Maquinaria Pesada'), 'Excavadora', 'Equipos de excavacion', 25),
((SELECT id FROM asset_categories WHERE name = 'Equipos de Bodega'), 'Montacargas', 'Equipos de manejo de materiales', 10),
((SELECT id FROM asset_categories WHERE name = 'Equipos de Bodega'), 'Carretilla Elevadora', 'Equipos de elevacion en bodega', 15);

-- Personal de mantenimiento
INSERT INTO maintenance_personnel (employee_code, first_name, last_name, email, phone, specializations, certification_level, hourly_rate) VALUES
('MECH001', 'Juan Carlos', 'Perez Lopez', 'juan.perez@luxchile.com', '+56912345678', ARRAY['Motores Diesel', 'Sistemas Hidraulicos'], 'expert', 15000),
('MECH002', 'Maria Elena', 'Gonzalez Silva', 'maria.gonzalez@luxchile.com', '+56987654321', ARRAY['Sistemas Electricos', 'Diagnostico'], 'advanced', 12000),
('MECH003', 'Carlos Alberto', 'Ruiz Morales', 'carlos.ruiz@luxchile.com', '+56911223344', ARRAY['Frenos', 'Suspension'], 'intermediate', 10000),
('MECH004', 'Ana Patricia', 'Munoz Castro', 'ana.munoz@luxchile.com', '+56955667788', ARRAY['Transmisiones', 'Embragues'], 'advanced', 11500),
('MECH005', 'Roberto Jose', 'Hernandez Vega', 'roberto.hernandez@luxchile.com', '+56933445566', ARRAY['Neumaticos', 'Alineacion'], 'basic', 8000);

-- Tipos de mantenimiento
INSERT INTO maintenance_types (name, category, description, estimated_duration, frequency_days, priority_level, cost_estimate) VALUES
('Mantenimiento Preventivo Basico', 'preventive', 'Revision general, cambio de fluidos basicos', 4, 30, 3, 150000),
('Mantenimiento Preventivo Completo', 'preventive', 'Revision exhaustiva, cambio de filtros y fluidos', 8, 90, 2, 350000),
('Inspeccion Tecnica', 'preventive', 'Revision tecnica obligatoria', 2, 365, 4, 80000),
('Reparacion de Motor', 'corrective', 'Reparacion de componentes del motor', 24, null, 1, 800000),
('Reparacion de Frenos', 'corrective', 'Reparacion sistema de frenado', 6, null, 1, 200000),
('Analisis de Vibraciones', 'predictive', 'Diagnostico predictivo mediante analisis', 3, 60, 3, 120000),
('Reparacion de Emergencia', 'emergency', 'Reparacion urgente en ruta', 4, null, 1, 300000);

-- Algunos repuestos comunes
INSERT INTO maintenance_parts (part_number, name, brand_id, category, unit_price, stock_quantity, minimum_stock) VALUES
('OF001', 'Filtro de Aceite Volvo FH', (SELECT id FROM brands WHERE name = 'Volvo'), 'Filtros', 25000, 50, 10),
('OF002', 'Aceite Motor 15W40 (20L)', null, 'Lubricantes', 45000, 30, 5),
('BK001', 'Pastillas Freno Delanteras', null, 'Frenos', 85000, 20, 5),
('BK002', 'Discos Freno Traseros', null, 'Frenos', 120000, 15, 3),
('TY001', 'Neumatico 315/80R22.5', null, 'Neumaticos', 180000, 12, 4),
('HY001', 'Fluido Hidraulico (20L)', null, 'Lubricantes', 35000, 25, 5);

COMMIT;