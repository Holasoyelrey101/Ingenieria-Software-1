-- ======================================
-- Lux ERP - Esquema Base de Datos
-- Fecha: Sprint 1
-- ======================================

-- ============================================
-- DELIVERY_REQUESTS (debe ir antes que 002)
-- ============================================
CREATE TABLE IF NOT EXISTS delivery_requests (
    id SERIAL PRIMARY KEY,
    origin_lat NUMERIC(10,7),
    origin_lng NUMERIC(10,7),
    origin_address TEXT,
    destination_lat NUMERIC(10,7),
    destination_lng NUMERIC(10,7),
    destination_address TEXT,
    distance_m INTEGER,
    duration_s INTEGER,
    route_polyline TEXT,
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    driver_id INTEGER,
    vehicle_id INTEGER,
    notes TEXT
);

-- ============================================
-- INVENTARIO
-- ============================================

CREATE TABLE IF NOT EXISTS bodegas (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    ubicacion VARCHAR(200)
);

CREATE TABLE IF NOT EXISTS productos (
    id SERIAL PRIMARY KEY,
    sku VARCHAR(50) UNIQUE NOT NULL,
    nombre VARCHAR(150) NOT NULL,
    categoria VARCHAR(100),
    precio NUMERIC(10,2)
);

CREATE TABLE IF NOT EXISTS stock (
    id SERIAL PRIMARY KEY,
    bodega_id INT REFERENCES bodegas(id) ON DELETE CASCADE,
    producto_id INT REFERENCES productos(id) ON DELETE CASCADE,
    cantidad INT NOT NULL DEFAULT 0,
    UNIQUE (bodega_id, producto_id)
);

CREATE TABLE IF NOT EXISTS movimientos (
    id SERIAL PRIMARY KEY,
    producto_id INT REFERENCES productos(id) ON DELETE CASCADE,
    origen_id INT REFERENCES bodegas(id),
    destino_id INT REFERENCES bodegas(id),
    cantidad INT NOT NULL,
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS umbrales_stock (
    id SERIAL PRIMARY KEY,
    producto_id INT REFERENCES productos(id) ON DELETE CASCADE,
    bodega_id INT REFERENCES bodegas(id) ON DELETE CASCADE,
    minimo INT NOT NULL,
    maximo INT,
    UNIQUE (producto_id, bodega_id)
);

CREATE TABLE IF NOT EXISTS alertas (
    id SERIAL PRIMARY KEY,
    producto_id INT REFERENCES productos(id),
    bodega_id INT REFERENCES bodegas(id),
    tipo VARCHAR(50),
    mensaje TEXT,
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    leida BOOLEAN DEFAULT FALSE
);
