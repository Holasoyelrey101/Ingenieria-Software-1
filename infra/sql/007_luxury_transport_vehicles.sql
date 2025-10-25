-- ======================================================
-- ACTUALIZACION: VEHICULOS DE TRANSPORTE DE LUJO BLINDADO
-- Reemplaza vehiculos regulares por vehiculos especializados
-- en transporte seguro de articulos de alto valor
-- ======================================================

-- Limpiar datos existentes
DELETE FROM maintenance_reminders;
DELETE FROM maintenance_task_parts;
DELETE FROM maintenance_history;
DELETE FROM maintenance_tasks;
DELETE FROM assets;
DELETE FROM vehicle_models;

-- Actualizar categorias de activos para transporte de lujo
UPDATE asset_categories SET 
    name = 'Vehiculos Blindados de Carga',
    description = 'Camiones y furgones blindados para transporte seguro de objetos de lujo y alto valor'
WHERE name = 'Vehiculos de Carga';

UPDATE asset_categories SET 
    name = 'Equipos de Seguridad Especializada',
    description = 'Montacargas blindados y equipos especializados para manejo seguro'
WHERE name = 'Equipos de Bodega';

-- Modelos de vehiculos especializados en transporte de lujo
INSERT INTO vehicle_models (brand_id, vehicle_type_id, name, year_from, year_to, engine_type, fuel_type, specifications) VALUES
(
    (SELECT id FROM brands WHERE name = 'Volvo'), 
    (SELECT id FROM vehicle_types WHERE name = 'Camion Pesado'), 
    'FH16 SecureTransport', 
    2020, 2025, 'D16K750 Blindado', 'Diesel', 
    '{"potencia": "750 HP", "torque": "3550 Nm", "blindaje": "Nivel 3", "camaras": "360 grados 4K", "gps_tracking": "Anti-jamming", "compartimento": "Temperatura controlada"}'
),
(
    (SELECT id FROM brands WHERE name = 'Mercedes-Benz'), 
    (SELECT id FROM vehicle_types WHERE name = 'Camion Pesado'), 
    'Actros SecureCargo', 
    2021, 2025, 'OM471LA Reforzado', 'Diesel', 
    '{"potencia": "510 HP", "torque": "2500 Nm", "blindaje": "Nivel 2", "camaras": "Perimetrales HD", "alarma": "Silenciosa", "compartimento": "Anti-robo"}'
),
(
    (SELECT id FROM brands WHERE name = 'Mercedes-Benz'), 
    (SELECT id FROM vehicle_types WHERE name = 'Furgon'), 
    'Sprinter LuxSecure', 
    2022, 2025, 'OM651 Blindado', 'Diesel', 
    '{"potencia": "190 HP", "blindaje": "Nivel 1", "camaras": "Interior/Exterior", "biometria": "Acceso restringido", "clima": "Controlado"}'
),
(
    (SELECT id FROM brands WHERE name = 'Mercedes-Benz'), 
    (SELECT id FROM vehicle_types WHERE name = 'Furgon'), 
    'EQS SecureLux Electric', 
    2023, 2025, 'Electric Blindado', 'Electrico', 
    '{"potencia": "450 HP", "bateria": "Blindada 108kWh", "camaras": "AI-Enhanced", "anti_interferencia": "Activa", "autonomia": "400km blindado"}'
),
(
    (SELECT id FROM brands WHERE name = 'Clark'), 
    (SELECT id FROM vehicle_types WHERE name = 'Montacargas'), 
    'C25D SecureLifting', 
    2023, 2025, 'Nissan K25 Reforzado', 'Diesel', 
    '{"capacidad": "2.5 ton", "blindaje": "Ligero", "camaras": "360 grados", "sensores": "Anti-vibracion", "certificacion": "Objetos fragiles"}'
);

-- Activos especializados en transporte de lujo con camaras de seguridad
INSERT INTO assets (
    name, vehicle_model_id, serial_number, license_plate, vin_number, 
    location, status, acquisition_date, warranty_end_date, purchase_price, 
    current_value, mileage, engine_hours, next_inspection_date, insurance_policy,
    notes, asset_metadata
) VALUES
(
    'Camion Blindado Volvo FH-001 SecureTransport',
    (SELECT id FROM vehicle_models WHERE name = 'FH16 SecureTransport'),
    'VLVS2023001',
    'BBSEC01',
    'YV2SECURE0KA123456',
    'Terminal Puerto Santiago',
    'active',
    '2023-03-15',
    '2026-03-15',
    280000000,  -- $280M CLP (incluye blindaje)
    250000000,  -- $250M CLP
    45000,
    2250,
    '2025-11-15',
    'POL-BLINDADO-2023-001',
    'Vehiculo principal para transporte de objetos de alto valor. Sistema de seguridad integral con camaras 4K y GPS anti-jamming.',
    '{"nivel_blindaje": 3, "camaras": {"cantidad": 8, "resolucion": "4K", "vision_nocturna": true}, "gps": {"tipo": "anti-jamming", "backup": true}, "certificaciones": ["ISO27001", "Transporte_Seguro_Nivel_A"]}'
),
(
    'Mercedes Actros A-002 Premium SecureCargo',
    (SELECT id FROM vehicle_models WHERE name = 'Actros SecureCargo'),
    'MERS2023002',
    'BBSEC02',
    'WDBSECURE1L123457',
    'Centro Distribucion Las Condes',
    'active',
    '2023-06-20',
    '2026-06-20',
    220000000,
    200000000,
    38000,
    1900,
    '2025-12-20',
    'POL-BLINDADO-2023-002',
    'Vehiculo para distribucion regional de articulos premium. Compartimento climatizado y sistema de alarma silenciosa.',
    '{"nivel_blindaje": 2, "camaras": {"perimetrales": 6, "interiores": 4}, "clima": {"temperatura": "controlada", "humedad": "controlada"}, "alarma": "silenciosa_conectada_central"}'
),
(
    'Furgon Blindado Mercedes V-003 LuxSecure',
    (SELECT id FROM vehicle_models WHERE name = 'Sprinter LuxSecure'),
    'MERV2024003',
    'BBSEC03',
    'VS2SECURE05123458',
    'Showroom Providencia',
    'active',
    '2024-01-10',
    '2027-01-10',
    150000000,
    140000000,
    12000,
    600,
    '2026-01-10',
    'POL-BLINDADO-2024-001',
    'Furgon especializado para transporte urbano de joyas y arte. Acceso biometrico y compartimento anti-robo.',
    '{"blindaje": "nivel_1", "acceso": "biometrico", "compartimento": "anti_robo_certificado", "seguimiento": "tiempo_real"}'
),
(
    'Mercedes Sprinter S-004 Luxury SecureVan',
    (SELECT id FROM vehicle_models WHERE name = 'Sprinter LuxSecure'),
    'MERLS2023004',
    'BBSEC04',
    'WLUXSECURE123459',
    'Terminal Aeroporto SCL',
    'maintenance',
    '2023-09-05',
    '2026-09-05',
    160000000,
    145000000,
    25000,
    1250,
    '2025-10-30',
    'POL-BLINDADO-2023-003',
    'Van de lujo para transporte VIP de objetos valiosos. Actualmente en mantenimiento de sistemas de seguridad.',
    '{"nivel_seguridad": "alto", "sistemas": ["camaras_HD", "GPS_tracking", "comunicacion_satelital"], "mantenimiento": "sistemas_seguridad"}'
),
(
    'Montacargas Blindado Toyota 8FG25-005',
    (SELECT id FROM vehicle_models WHERE name = 'C25D SecureLifting'),
    'CLKS2024005',
    NULL,
    'CLKSECURE24123460',
    'Bodega Articulos Premium',
    'active',
    '2024-05-15',
    '2027-05-15',
    45000000,  -- Mas caro por blindaje y sensores
    42000000,
    NULL,
    450,
    '2025-11-15',
    'POL-EQUIPO-2024-001',
    'Montacargas especializado para manejo seguro de objetos fragiles de alto valor. Sensores anti-vibracion y camaras 360 grados.',
    '{"blindaje": "ligero", "sensores": ["anti_vibracion", "peso_precision", "temperatura"], "camaras": "360_grados", "certificacion": "objetos_fragiles_lujo"}'
),
(
    'Furgon Audi Q8 A-006 VIP SecureTransport',
    (SELECT id FROM vehicle_models WHERE name = 'Sprinter LuxSecure'),
    'AUDQ2024006',
    'BBSEC06',
    'WAUDISECURE123461',
    'Base Vitacura',
    'active',
    '2024-02-20',
    '2027-02-20',
    180000000,
    170000000,
    15000,
    750,
    '2025-12-15',
    'POL-BLINDADO-2024-002',
    'Vehiculo VIP para transporte ejecutivo seguro. Sistema de seguridad perimetral y camaras termicas.',
    '{"categoria": "VIP", "seguridad": "perimetral", "camaras": "termicas", "blindaje": "ejecutivo", "comunicacion": "encriptada"}'
),
(
    'Mercedes EQS E-007 Electric SecureLux',
    (SELECT id FROM vehicle_models WHERE name = 'EQS SecureLux Electric'),
    'MEQE2024007',
    'BBSEC07',
    'WMEQSECURE123462',
    'Estacion de Carga Premium',
    'active',
    '2024-03-10',
    '2027-03-10',
    320000000,  -- Vehiculo electrico de lujo blindado
    300000000,
    8000,
    NULL,  -- Es electrico
    '2025-11-20',
    'POL-ELECTRICO-2024-001',
    'Vehiculo electrico de lujo blindado. Bateria blindada, camaras con IA y sistema anti-interferencia activa.',
    '{"tipo": "electrico", "bateria": "blindada_108kWh", "camaras": "AI_enhanced", "anti_interferencia": "activa", "autonomia_blindado": "400km", "carga": "rapida_segura"}'
),
(
    'Scania R450 S-008 Armored Cargo',
    (SELECT id FROM vehicle_models WHERE name = 'Actros SecureCargo'),
    'SCAR2022008',
    'BBSEC08',
    'YSSCANIASEC123463',
    'Terminal Puerto Valparaiso',
    'maintenance',
    '2022-08-15',
    '2025-08-15',
    400000000,  -- Blindaje pesado
    350000000,
    55000,
    2750,
    '2025-10-25',
    'POL-BLINDADO-2022-001',
    'Camion blindado pesado para transporte de obras de arte y objetos de extremo valor. Compartimento criogenico.',
    '{"blindaje": "pesado_nivel_4", "compartimento": "criogenico", "arte": "certificado_internacional", "seguridad": "maxima", "mantenimiento": "sistemas_criogenicos"}'
);

COMMIT;