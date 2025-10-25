-- 005_rrhh_schema.sql
-- Esquema inicial para modulo RR.HH. (employees, shifts, shift_assignments, trainings)

BEGIN;

CREATE TABLE IF NOT EXISTS employees (
    id SERIAL PRIMARY KEY,
    rut VARCHAR(32),
    nombre VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS shifts (
    id SERIAL PRIMARY KEY,
    tipo VARCHAR(128) NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    timezone VARCHAR(64) DEFAULT 'America/Santiago' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS shift_assignments (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    shift_id INTEGER NOT NULL REFERENCES shifts(id) ON DELETE RESTRICT,
    date DATE NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE (employee_id, shift_id, date)
);

-- Optional trainings tables placeholder (used by HU10 later)
CREATE TABLE IF NOT EXISTS trainings (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    topic VARCHAR(255),
    required BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS employee_trainings (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    training_id INTEGER NOT NULL REFERENCES trainings(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    instructor VARCHAR(255),
    status VARCHAR(32) DEFAULT 'COMPLETED',
    certificate_url TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS ix_shift_assignments_employee_id ON shift_assignments(employee_id);
CREATE INDEX IF NOT EXISTS ix_shift_assignments_date ON shift_assignments(date);
CREATE INDEX IF NOT EXISTS ix_shift_assignments_employee_date ON shift_assignments(employee_id, date);

CREATE INDEX IF NOT EXISTS ix_employee_trainings_employee_id ON employee_trainings(employee_id);
CREATE INDEX IF NOT EXISTS ix_employee_trainings_training_id ON employee_trainings(training_id);
CREATE INDEX IF NOT EXISTS ix_employee_trainings_date ON employee_trainings(date);

COMMIT;
