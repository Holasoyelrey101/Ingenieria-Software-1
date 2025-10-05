-- seed_clean.sql (versión lujo simplificada)
-- Reinicia y carga datos de lujo usando sólo columnas básicas de productos
BEGIN;
SET client_encoding='UTF8';

TRUNCATE TABLE movimientos, alertas, stock, umbrales_stock, productos, bodegas RESTART IDENTITY CASCADE;

-- Bodegas de lujo
INSERT INTO bodegas (nombre, ubicacion) VALUES
('Central Luxury Hub', 'Av. Alta Gama 1000'),
('Boutique Norte', 'Mall Norte Nivel 2'),
('Duty Free Oriente', 'Aeropuerto Intl. Terminal 1'),
('Almacén Seguridad', 'Bóveda Subterránea Zona 3');

-- Productos (sin columnas extendidas ya removidas del esquema)
INSERT INTO productos (sku, nombre, categoria, precio) VALUES
('LX-PER-001', 'Chanel No.5 Eau de Parfum 100ml', 'Perfumería', 185.00),
('LX-PER-002', 'Dior Sauvage 100ml', 'Perfumería', 165.00),
('LX-PER-003', 'Creed Aventus 100ml', 'Perfumería', 395.00),
('LX-JOY-001', 'Anillo Oro 18K Diamante 0.5ct', 'Joyería', 3200.00),
('LX-JOY-002', 'Collar Platino Zafiro', 'Joyería', 5400.00),
('LX-JOY-003', 'Reloj Suizo Automático Edición Limitada', 'Joyería', 12500.00),
('LX-ELE-001', 'Smartphone Flagship 1TB', 'Electrónica', 1999.00),
('LX-ELE-002', 'Smartwatch Titanio Pro', 'Electrónica', 899.00),
('LX-ELE-003', 'Auriculares Inalámbricos Hi‑Fi ANC', 'Electrónica', 549.00),
('LX-ELE-004', 'Ultrabook Carbono 32GB/2TB', 'Electrónica', 2890.00),
('LX-ELE-005', 'Cámara Mirrorless Full Frame Pro', 'Electrónica', 3490.00);

-- Stock
INSERT INTO stock (bodega_id, producto_id, cantidad) VALUES
-- Central Luxury Hub
((SELECT id FROM bodegas WHERE nombre='Central Luxury Hub'), (SELECT id FROM productos WHERE sku='LX-PER-001'), 40),
((SELECT id FROM bodegas WHERE nombre='Central Luxury Hub'), (SELECT id FROM productos WHERE sku='LX-PER-002'), 35),
((SELECT id FROM bodegas WHERE nombre='Central Luxury Hub'), (SELECT id FROM productos WHERE sku='LX-PER-003'), 15),
((SELECT id FROM bodegas WHERE nombre='Central Luxury Hub'), (SELECT id FROM productos WHERE sku='LX-JOY-001'), 5),
((SELECT id FROM bodegas WHERE nombre='Central Luxury Hub'), (SELECT id FROM productos WHERE sku='LX-JOY-002'), 3),
((SELECT id FROM bodegas WHERE nombre='Central Luxury Hub'), (SELECT id FROM productos WHERE sku='LX-JOY-003'), 2),
((SELECT id FROM bodegas WHERE nombre='Central Luxury Hub'), (SELECT id FROM productos WHERE sku='LX-ELE-001'), 25),
((SELECT id FROM bodegas WHERE nombre='Central Luxury Hub'), (SELECT id FROM productos WHERE sku='LX-ELE-004'), 6),
-- Boutique Norte
((SELECT id FROM bodegas WHERE nombre='Boutique Norte'), (SELECT id FROM productos WHERE sku='LX-PER-001'), 15),
((SELECT id FROM bodegas WHERE nombre='Boutique Norte'), (SELECT id FROM productos WHERE sku='LX-PER-002'), 12),
((SELECT id FROM bodegas WHERE nombre='Boutique Norte'), (SELECT id FROM productos WHERE sku='LX-ELE-002'), 10),
((SELECT id FROM bodegas WHERE nombre='Boutique Norte'), (SELECT id FROM productos WHERE sku='LX-ELE-003'), 18),
-- Duty Free Oriente
((SELECT id FROM bodegas WHERE nombre='Duty Free Oriente'), (SELECT id FROM productos WHERE sku='LX-PER-001'), 20),
((SELECT id FROM bodegas WHERE nombre='Duty Free Oriente'), (SELECT id FROM productos WHERE sku='LX-PER-003'), 8),
((SELECT id FROM bodegas WHERE nombre='Duty Free Oriente'), (SELECT id FROM productos WHERE sku='LX-ELE-002'), 8),
((SELECT id FROM bodegas WHERE nombre='Duty Free Oriente'), (SELECT id FROM productos WHERE sku='LX-ELE-003'), 25),
((SELECT id FROM bodegas WHERE nombre='Duty Free Oriente'), (SELECT id FROM productos WHERE sku='LX-ELE-001'), 12),
-- Almacén Seguridad
((SELECT id FROM bodegas WHERE nombre='Almacén Seguridad'), (SELECT id FROM productos WHERE sku='LX-JOY-001'), 10),
((SELECT id FROM bodegas WHERE nombre='Almacén Seguridad'), (SELECT id FROM productos WHERE sku='LX-JOY-002'), 6),
((SELECT id FROM bodegas WHERE nombre='Almacén Seguridad'), (SELECT id FROM productos WHERE sku='LX-JOY-003'), 4),
((SELECT id FROM bodegas WHERE nombre='Almacén Seguridad'), (SELECT id FROM productos WHERE sku='LX-ELE-004'), 10),
((SELECT id FROM bodegas WHERE nombre='Almacén Seguridad'), (SELECT id FROM productos WHERE sku='LX-ELE-005'), 12);

-- Umbrales
INSERT INTO umbrales_stock (producto_id, bodega_id, minimo, maximo) VALUES
((SELECT id FROM productos WHERE sku='LX-PER-001'), (SELECT id FROM bodegas WHERE nombre='Central Luxury Hub'), 10, 60),
((SELECT id FROM productos WHERE sku='LX-PER-003'), (SELECT id FROM bodegas WHERE nombre='Central Luxury Hub'), 5, 25),
((SELECT id FROM productos WHERE sku='LX-JOY-001'), (SELECT id FROM bodegas WHERE nombre='Central Luxury Hub'), 2, 8),
((SELECT id FROM productos WHERE sku='LX-JOY-003'), (SELECT id FROM bodegas WHERE nombre='Central Luxury Hub'), 1, 4),
((SELECT id FROM productos WHERE sku='LX-ELE-001'), (SELECT id FROM bodegas WHERE nombre='Central Luxury Hub'), 8, 40),
((SELECT id FROM productos WHERE sku='LX-PER-001'), (SELECT id FROM bodegas WHERE nombre='Boutique Norte'), 5, 25),
((SELECT id FROM productos WHERE sku='LX-ELE-003'), (SELECT id FROM bodegas WHERE nombre='Boutique Norte'), 6, 30),
((SELECT id FROM productos WHERE sku='LX-PER-002'), (SELECT id FROM bodegas WHERE nombre='Duty Free Oriente'), 6, 40),
((SELECT id FROM productos WHERE sku='LX-ELE-001'), (SELECT id FROM bodegas WHERE nombre='Duty Free Oriente'), 6, 30),
((SELECT id FROM productos WHERE sku='LX-JOY-002'), (SELECT id FROM bodegas WHERE nombre='Almacén Seguridad'), 2, 12),
((SELECT id FROM productos WHERE sku='LX-ELE-005'), (SELECT id FROM bodegas WHERE nombre='Almacén Seguridad'), 4, 20);

-- Movimientos
INSERT INTO movimientos (producto_id, origen_id, destino_id, cantidad, fecha) VALUES
((SELECT id FROM productos WHERE sku='LX-JOY-001'), (SELECT id FROM bodegas WHERE nombre='Almacén Seguridad'), (SELECT id FROM bodegas WHERE nombre='Central Luxury Hub'), 2, NOW() - INTERVAL '7 days'),
((SELECT id FROM productos WHERE sku='LX-PER-001'), (SELECT id FROM bodegas WHERE nombre='Central Luxury Hub'), (SELECT id FROM bodegas WHERE nombre='Boutique Norte'), 5, NOW() - INTERVAL '3 days'),
((SELECT id FROM productos WHERE sku='LX-ELE-002'), (SELECT id FROM bodegas WHERE nombre='Central Luxury Hub'), (SELECT id FROM bodegas WHERE nombre='Duty Free Oriente'), 4, NOW() - INTERVAL '2 days'),
((SELECT id FROM productos WHERE sku='LX-ELE-004'), (SELECT id FROM bodegas WHERE nombre='Almacén Seguridad'), (SELECT id FROM bodegas WHERE nombre='Central Luxury Hub'), 2, NOW() - INTERVAL '36 hours'),
((SELECT id FROM productos WHERE sku='LX-JOY-003'), (SELECT id FROM bodegas WHERE nombre='Almacén Seguridad'), (SELECT id FROM bodegas WHERE nombre='Central Luxury Hub'), 1, NOW() - INTERVAL '18 hours');

-- Alertas
INSERT INTO alertas (producto_id, bodega_id, tipo, mensaje, leida) VALUES
((SELECT id FROM productos WHERE sku='LX-PER-003'), (SELECT id FROM bodegas WHERE nombre='Central Luxury Hub'), 'REPOSICION', 'Aventus demanda creciente, evaluar reorder.', FALSE),
((SELECT id FROM productos WHERE sku='LX-JOY-002'), (SELECT id FROM bodegas WHERE nombre='Central Luxury Hub'), 'BAJO_STOCK', 'Collar Platino Zafiro cercano a mínimo', FALSE),
((SELECT id FROM productos WHERE sku='LX-ELE-001'), (SELECT id FROM bodegas WHERE nombre='Duty Free Oriente'), 'REPOSICION', 'Smartphone flagship rotación alta en Duty Free', FALSE),
((SELECT id FROM productos WHERE sku='LX-JOY-003'), (SELECT id FROM bodegas WHERE nombre='Almacén Seguridad'), 'VERIFICACION', 'Auditar inventario de relojes edición limitada', FALSE);

COMMIT;
