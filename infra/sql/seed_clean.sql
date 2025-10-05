-- seed_clean.sql
-- Limpia tablas y repuebla seed consistente (no asume ids)
BEGIN;

-- Asegurar codificación UTF-8 para que acentos se inserten correctamente incluso en entornos Windows
SET client_encoding='UTF8';

-- 1) BACKUP (opcional): puedes volcar tablas antes de borrar si lo deseas
-- COPY productos TO '/tmp/productos_backup.csv' CSV HEADER;
-- (omitido por defecto)

-- 2) Truncate / reset identity to start clean
TRUNCATE TABLE movimientos, alertas, stock, umbrales_stock, productos, bodegas RESTART IDENTITY CASCADE;

-- 3) Insertar bodegas
INSERT INTO bodegas (nombre, ubicacion) VALUES
('Bodega Central', 'Av. Principal 123'),
('Bodega Norte', 'Calle Secundaria 45');

-- 4) Insertar productos
INSERT INTO productos (sku, nombre, categoria, precio) VALUES
('SKU-001', 'Cinta Aislante 19mm', 'Ferretería', 3.50),
('SKU-002', 'Taladro Percutor 500W', 'Electro', 89.90),
('SKU-003', 'Tornillo 5x40mm (100u)', 'Ferretería', 5.20),
('SKU-004', 'Caja de Luces LED 12W', 'Iluminación', 24.00);

-- 5) Insertar stock usando subconsultas para referenciar ids reales
INSERT INTO stock (bodega_id, producto_id, cantidad) VALUES
( (SELECT id FROM bodegas WHERE nombre='Bodega Central'), (SELECT id FROM productos WHERE sku='SKU-001'), 120),
( (SELECT id FROM bodegas WHERE nombre='Bodega Central'), (SELECT id FROM productos WHERE sku='SKU-002'), 15),
( (SELECT id FROM bodegas WHERE nombre='Bodega Central'), (SELECT id FROM productos WHERE sku='SKU-003'), 500),
( (SELECT id FROM bodegas WHERE nombre='Bodega Norte'),   (SELECT id FROM productos WHERE sku='SKU-001'), 40),
( (SELECT id FROM bodegas WHERE nombre='Bodega Norte'),   (SELECT id FROM productos WHERE sku='SKU-004'), 30),
( (SELECT id FROM bodegas WHERE nombre='Bodega Norte'),   (SELECT id FROM productos WHERE sku='SKU-003'), 200);

-- 6) Umbrales de stock (misma estrategia)
INSERT INTO umbrales_stock (producto_id, bodega_id, minimo, maximo) VALUES
( (SELECT id FROM productos WHERE sku='SKU-001'), (SELECT id FROM bodegas WHERE nombre='Bodega Central'), 20, 300),
( (SELECT id FROM productos WHERE sku='SKU-002'), (SELECT id FROM bodegas WHERE nombre='Bodega Central'), 5, 50),
( (SELECT id FROM productos WHERE sku='SKU-003'), (SELECT id FROM bodegas WHERE nombre='Bodega Central'), 100, 1000),
( (SELECT id FROM productos WHERE sku='SKU-001'), (SELECT id FROM bodegas WHERE nombre='Bodega Norte'), 10, 150),
( (SELECT id FROM productos WHERE sku='SKU-004'), (SELECT id FROM bodegas WHERE nombre='Bodega Norte'), 5, 200);

-- 7) Movimientos de ejemplo (referenciando ids reales)
INSERT INTO movimientos (producto_id, origen_id, destino_id, cantidad, fecha) VALUES
( (SELECT id FROM productos WHERE sku='SKU-001'), (SELECT id FROM bodegas WHERE nombre='Bodega Central'), (SELECT id FROM bodegas WHERE nombre='Bodega Norte'), 20, NOW() - INTERVAL '2 days'),
( (SELECT id FROM productos WHERE sku='SKU-003'), (SELECT id FROM bodegas WHERE nombre='Bodega Central'), (SELECT id FROM bodegas WHERE nombre='Bodega Norte'), 100, NOW() - INTERVAL '1 day');

-- 8) Alertas de ejemplo
INSERT INTO alertas (producto_id, bodega_id, tipo, mensaje, leida) VALUES
( (SELECT id FROM productos WHERE sku='SKU-002'), (SELECT id FROM bodegas WHERE nombre='Bodega Central'), 'BAJO_STOCK', 'Stock por debajo del mínimo en Bodega Central', FALSE),
( (SELECT id FROM productos WHERE sku='SKU-004'), (SELECT id FROM bodegas WHERE nombre='Bodega Norte'), 'REPOSICION', 'Solicitar reposición de Caja de Luces LED en Bodega Norte', FALSE);

COMMIT;
