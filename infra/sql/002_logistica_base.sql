-- 002_logistica_base.sql
-- Tablas base para logística: rutas, paradas, entregas, asignaciones, incidencias.
-- Cubre soporte para optimización/visualización de rutas, asociación de incidentes y reportes.

BEGIN;

-- Vehículos y conductores (catálogos ligeros)
CREATE TABLE IF NOT EXISTS vehicles (
    id SERIAL PRIMARY KEY,
    code VARCHAR(64) UNIQUE NOT NULL,
    capacity_kg INTEGER,
    active BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS drivers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    license VARCHAR(64),
    active BOOLEAN DEFAULT TRUE
);

-- Rutas planificadas/ejecutadas
CREATE TABLE IF NOT EXISTS routes (
    id SERIAL PRIMARY KEY,
    name VARCHAR(128),
    status VARCHAR(32) DEFAULT 'planned', -- planned|in_progress|completed|canceled
    polyline TEXT,                         -- encoded polyline
    distance_m INTEGER,
    duration_s INTEGER,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Paradas de una ruta
CREATE TABLE IF NOT EXISTS route_stops (
    id SERIAL PRIMARY KEY,
    route_id INT NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
    seq INT NOT NULL,
    location JSONB,              -- {lat,lng,address}
    planned_arrival TIMESTAMPTZ,
    planned_departure TIMESTAMPTZ,
    actual_arrival TIMESTAMPTZ,
    actual_departure TIMESTAMPTZ,
    CONSTRAINT uq_route_stop UNIQUE(route_id, seq)
);

-- Solicitudes de entrega existentes (delivery_requests) se vinculan a paradas (N:M opcional vía intermedia)
CREATE TABLE IF NOT EXISTS delivery_route_stop (
    route_stop_id INT NOT NULL REFERENCES route_stops(id) ON DELETE CASCADE,
    delivery_request_id INT NOT NULL REFERENCES delivery_requests(id) ON DELETE CASCADE,
    PRIMARY KEY (route_stop_id, delivery_request_id)
);

-- Asignaciones de recursos a rutas
CREATE TABLE IF NOT EXISTS route_assignments (
    id SERIAL PRIMARY KEY,
    route_id INT NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
    vehicle_id INT REFERENCES vehicles(id),
    driver_id INT REFERENCES drivers(id),
    assigned_at TIMESTAMPTZ DEFAULT now()
);

-- Incidentes en ruta
CREATE TABLE IF NOT EXISTS incidents (
    id SERIAL PRIMARY KEY,
    route_id INT REFERENCES routes(id) ON DELETE SET NULL,
    route_stop_id INT REFERENCES route_stops(id) ON DELETE SET NULL,
    severity VARCHAR(16),          -- info|low|medium|high
    type VARCHAR(64),              -- breakdown|delay|traffic|weather|other
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Índices útiles
CREATE INDEX IF NOT EXISTS ix_routes_status ON routes(status);
CREATE INDEX IF NOT EXISTS ix_route_stops_route ON route_stops(route_id);
CREATE INDEX IF NOT EXISTS ix_incidents_route ON incidents(route_id);

COMMIT;
