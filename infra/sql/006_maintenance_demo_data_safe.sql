-- 006_maintenance_demo_data_safe.sql
-- -*- coding: utf-8 -*-
-- DATOS DEMO OPCIONALES PARA SISTEMA DE MANTENIMIENTO
-- Encoding: UTF8
-- Nota: Los errores aquí se ignoran - es solo datos de demostración

SET client_encoding = 'UTF8';

BEGIN;

-- Los inserts aquí son opcionales y no detienen la inicialización
INSERT INTO vehicle_models (brand_id, vehicle_type_id, name, year_from, year_to, engine_type, fuel_type, specifications) VALUES
((SELECT id FROM brands WHERE name = 'Volvo' ORDER BY id LIMIT 1), 
 (SELECT id FROM vehicle_types WHERE name = 'Camión Pesado' ORDER BY id LIMIT 1), 
 'FH16 750', 2018, 2025, 'D16K750', 'Diesel', 
 '{"potencia": "750 HP", "torque": "3550 Nm"}'::jsonb)
ON CONFLICT DO NOTHING;

COMMIT;
