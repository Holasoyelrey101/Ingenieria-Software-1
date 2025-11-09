-- 007_rrhh_roles.sql
-- Esquema de Roles, Contratos, y Turnos Dinámicos para LuxChile
-- Soporta: Turnos fijos + Turnos dinámicos de camioneros con validación de conducción

BEGIN;

-- ============================================
-- 1. TIPOS DE CONTRATO
-- ============================================
CREATE TABLE IF NOT EXISTS contract_types (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) UNIQUE NOT NULL,
    descripcion TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

INSERT INTO contract_types (nombre, descripcion) VALUES
('Tiempo Completo', 'Empleado de tiempo completo con turnos fijos'),
('Por Viaje', 'Conductor pago por viaje completado'),
('Freelance', 'Contratista independiente'),
('Jornada Parcial', 'Medio tiempo'),
('Temporal', 'Contrato temporal o por proyecto')
ON CONFLICT DO NOTHING;

-- ============================================
-- 2. ROLES
-- ============================================
CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) UNIQUE NOT NULL,
    descripcion TEXT,
    is_dynamic_shifts BOOLEAN DEFAULT FALSE,  -- ¿Sus turnos son dinámicos?
    requires_pairing BOOLEAN DEFAULT FALSE,    -- ¿Requiere pareja?
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

INSERT INTO roles (nombre, descripcion, is_dynamic_shifts, requires_pairing) VALUES
('Conductor', 'Conductor de camión con turnos dinámicos por ruta', TRUE, FALSE),
('Asistente de Carga', 'Ayudante de conductor (co-piloto)', TRUE, TRUE),
('Custodia de Valores', 'Escolta de seguridad en rutas de alto valor', TRUE, FALSE),
('Operario Almacén', 'Personal de almacén con turnos fijos', FALSE, FALSE),
('Supervisor Almacén', 'Supervisor de bodega con turnos flexibles', FALSE, FALSE),
('Vigilante Bodega', 'Vigilancia 24/7 de bodegas', FALSE, FALSE),
('Administrativo', 'Personal administrativo/oficina', FALSE, FALSE),
('Mecánico Flota', 'Mantenimiento de vehículos', FALSE, FALSE)
ON CONFLICT DO NOTHING;

-- ============================================
-- 3. SHIFT PROFILES (Perfiles de turno por rol)
-- ============================================
CREATE TABLE IF NOT EXISTS shift_profiles (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) UNIQUE NOT NULL,
    role_id INT REFERENCES roles(id),
    descripcion TEXT,
    is_flexible BOOLEAN DEFAULT FALSE,         -- ¿Se pueden cambiar turnos?
    auto_assign BOOLEAN DEFAULT TRUE,          -- ¿Auto-asignar?
    min_coverage INT DEFAULT 1,                -- Mínimo de personas requeridas
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

INSERT INTO shift_profiles (nombre, role_id, descripcion, is_flexible, auto_assign, min_coverage) VALUES
('Conductor Estándar', (SELECT id FROM roles WHERE nombre='Conductor'), 'Conductor con turnos dinámicos por ruta', TRUE, TRUE, 1),
('Operario Almacén Turno', (SELECT id FROM roles WHERE nombre='Operario Almacén'), 'Personal almacén turnos fijos', FALSE, TRUE, 3),
('Vigilante 24/7', (SELECT id FROM roles WHERE nombre='Vigilante Bodega'), 'Vigilancia continua', FALSE, TRUE, 2),
('Administrativo Oficina', (SELECT id FROM roles WHERE nombre='Administrativo'), 'Personal administrativo', FALSE, TRUE, 1)
ON CONFLICT DO NOTHING;

-- ============================================
-- 4. SHIFT PROFILE SHIFTS (Turnos predefinidos)
-- ============================================
CREATE TABLE IF NOT EXISTS shift_profile_shifts (
    id SERIAL PRIMARY KEY,
    profile_id INT REFERENCES shift_profiles(id) ON DELETE CASCADE,
    shift_id INT REFERENCES shifts(id) ON DELETE CASCADE,
    UNIQUE(profile_id, shift_id)
);

-- Asignar turnos fijos a perfiles
INSERT INTO shift_profile_shifts (profile_id, shift_id)
SELECT sp.id, s.id 
FROM shift_profiles sp
CROSS JOIN shifts s
WHERE sp.nombre = 'Operario Almacén Turno'
ON CONFLICT DO NOTHING;

-- ============================================
-- 5. MODIFICAR TABLA EMPLOYEES
-- ============================================
ALTER TABLE employees ADD COLUMN IF NOT EXISTS role_id INT REFERENCES roles(id);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS contract_type_id INT REFERENCES contract_types(id);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS shift_profile_id INT REFERENCES shift_profiles(id);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS vehicle_id INT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS paired_employee_id INT REFERENCES employees(id);

-- ============================================
-- 6. DYNAMIC SHIFTS (Turnos dinámicos de rutas)
-- ============================================
CREATE TABLE IF NOT EXISTS dynamic_shifts (
    id SERIAL PRIMARY KEY,
    route_id INT,  -- Referencia a routes (en ms-logistica)
    fecha_programada DATE NOT NULL,
    hora_inicio TIME NOT NULL,
    duracion_minutos INT NOT NULL,  -- Duración estimada total (incluye pausas)
    conduccion_continua_minutos INT DEFAULT 300,  -- 5 horas por defecto
    status VARCHAR(50) DEFAULT 'pendiente',  -- pendiente, asignado, en_curso, completado, cancelado
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    assigned_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE
);

-- ============================================
-- 7. DYNAMIC SHIFT ASSIGNMENTS
-- ============================================
CREATE TABLE IF NOT EXISTS dynamic_shift_assignments (
    id SERIAL PRIMARY KEY,
    dynamic_shift_id INT REFERENCES dynamic_shifts(id) ON DELETE CASCADE,
    employee_id INT REFERENCES employees(id) ON DELETE CASCADE,
    role_in_shift VARCHAR(50),  -- 'conductor', 'asistente', 'custodia'
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(50) DEFAULT 'asignado',  -- asignado, en_curso, completado, cancelado
    UNIQUE(dynamic_shift_id, employee_id, role_in_shift)
);

-- ============================================
-- 8. CONDUCCIÓN LOG (Registro de horas de conducción)
-- ============================================
CREATE TABLE IF NOT EXISTS driving_logs (
    id SERIAL PRIMARY KEY,
    employee_id INT REFERENCES employees(id) ON DELETE CASCADE,
    dynamic_shift_id INT REFERENCES dynamic_shifts(id) ON DELETE CASCADE,
    fecha DATE NOT NULL,
    minutos_conduccion INT NOT NULL,
    minutos_descanso INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ============================================
-- 9. ÍNDICES PARA PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS ix_employees_role_id ON employees(role_id);
CREATE INDEX IF NOT EXISTS ix_employees_contract_type_id ON employees(contract_type_id);
CREATE INDEX IF NOT EXISTS ix_dynamic_shifts_fecha ON dynamic_shifts(fecha_programada);
CREATE INDEX IF NOT EXISTS ix_dynamic_shifts_status ON dynamic_shifts(status);
CREATE INDEX IF NOT EXISTS ix_dynamic_shift_assignments_employee_id ON dynamic_shift_assignments(employee_id);
CREATE INDEX IF NOT EXISTS ix_dynamic_shift_assignments_dynamic_shift_id ON dynamic_shift_assignments(dynamic_shift_id);
CREATE INDEX IF NOT EXISTS ix_driving_logs_employee_date ON driving_logs(employee_id, fecha);

COMMIT;
