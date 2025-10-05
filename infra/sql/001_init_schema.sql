-- ======================================
-- Lux ERP - Esquema Base de Datos
-- Fecha: Sprint 1
-- ======================================

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
