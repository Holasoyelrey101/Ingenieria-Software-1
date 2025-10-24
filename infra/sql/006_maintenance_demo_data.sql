-- ======================================================
-- DATOS DEMO PARA SISTEMA DE MANTENIMIENTO ROBUSTO
-- ======================================================

-- Modelos de vehículos específicos
INSERT INTO vehicle_models (brand_id, vehicle_type_id, name, year_from, year_to, engine_type, fuel_type, specifications) VALUES
((SELECT id FROM brands WHERE name = 'Volvo'), (SELECT id FROM vehicle_types WHERE name = 'Camión Pesado'), 'FH16 750', 2018, 2025, 'D16K750', 'Diesel', '{"potencia": "750 HP", "torque": "3550 Nm", "cilindrada": "16.1L"}'),
((SELECT id FROM brands WHERE name = 'Mercedes-Benz'), (SELECT id FROM vehicle_types WHERE name = 'Camión Pesado'), 'Actros 2651', 2019, 2025, 'OM471LA', 'Diesel', '{"potencia": "510 HP", "torque": "2500 Nm", "cilindrada": "12.8L"}'),
((SELECT id FROM brands WHERE name = 'Scania'), (SELECT id FROM vehicle_types WHERE name = 'Camión Mediano'), 'P410', 2020, 2025, 'DC13', 'Diesel', '{"potencia": "410 HP", "torque": "2150 Nm", "cilindrada": "12.7L"}'),
((SELECT id FROM brands WHERE name = 'Liebherr'), (SELECT id FROM vehicle_types WHERE name = 'Grúa Móvil'), 'LTM 1055-3.2', 2017, 2025, 'D934LA7', 'Diesel', '{"capacidad": "55 toneladas", "altura_max": "56m", "potencia": "367 HP"}'),
((SELECT id FROM brands WHERE name = 'Clark'), (SELECT id FROM vehicle_types WHERE name = 'Montacargas'), 'C25D', 2021, 2025, 'Nissan K25', 'Diesel', '{"capacidad": "2.5 toneladas", "altura_elevacion": "4.5m", "potencia": "67 HP"}'::text)
ON CONFLICT DO NOTHING;

-- Activos específicos con información detallada
INSERT INTO assets (
    name, vehicle_model_id, serial_number, license_plate, vin_number, 
    location, status, acquisition_date, warranty_end_date, purchase_price, 
    current_value, mileage, engine_hours, next_inspection_date, insurance_policy,
    notes
) VALUES
(
    'Camión Volvo FH-001 - Transporte Principal',
    (SELECT id FROM vehicle_models WHERE name = 'FH16 750'),
    'VLV2023001',
    'BBCH12',
    'YV2A0D2C3KA123456',
    'Terminal Puerto Santiago',
    'active',
    '2023-03-15',
    '2026-03-15',
    185000000,  -- $185M CLP
    165000000,  -- $165M CLP
    45000,      -- 45,000 km
    2250,       -- 2,250 horas motor
    '2025-11-15',
    'POL-VH-2023-001',
    'Vehículo principal para rutas largas. Excelente estado mecánico.'
),
(
    'Mercedes Actros A-002 - Distribución Regional',
    (SELECT id FROM vehicle_models WHERE name = 'Actros 2651'),
    'MER2023002',
    'BBCH13',
    'WDB9630251L123457',
    'Centro Distribución Maipú',
    'active',
    '2023-06-20',
    '2026-06-20',
    160000000,
    145000000,
    38000,
    1900,
    '2025-12-20',
    'POL-VH-2023-002',
    'Vehículo para distribución regional. Mantenimiento al día.'
),
(
    'Scania P410 S-003 - Reparto Local',
    (SELECT id FROM vehicle_models WHERE name = 'P410'),
    'SCA2024003',
    'BBCH14',
    'YS2R6X20005123458',
    'Base Operacional Las Condes',
    'active',
    '2024-01-10',
    '2027-01-10',
    95000000,
    90000000,
    12000,
    600,
    '2026-01-10',
    'POL-VH-2024-001',
    'Vehículo nuevo para reparto urbano. Bajo kilometraje.'
),
(
    'Grúa Liebherr LTM-004 - Obras Especiales',
    (SELECT id FROM vehicle_models WHERE name = 'LTM 1055-3.2'),
    'LBR2022004',
    'BBCH15',
    'WLBR12345A0123459',
    'Patio de Maquinaria',
    'maintenance',
    '2022-09-05',
    '2025-09-05',
    450000000,
    380000000,
    8500,
    850,
    '2025-10-30',
    'POL-MQ-2022-001',
    'Grúa especializada para trabajos pesados. En mantenimiento preventivo.'
),
(
    'Montacargas Clark C25-005 - Bodega Principal',
    (SELECT id FROM vehicle_models WHERE name = 'C25D'),
    'CLK2024005',
    NULL,
    'CLK25D2024123460',
    'Bodega Central A',
    'active',
    '2024-05-15',
    '2027-05-15',
    28000000,
    26000000,
    NULL,
    450,
    '2025-11-15',
    'POL-EQ-2024-001',
    'Montacargas para operaciones de bodega. Uso intensivo diario.'
);

-- Tareas de mantenimiento más realistas y detalladas
INSERT INTO maintenance_tasks (
    id, asset_id, maintenance_type_id, assigned_to, title, description,
    priority, status, scheduled_date, due_date, estimated_duration, estimated_cost,
    work_order_number, task_metadata
) VALUES
(
    gen_random_uuid()::text,
    (SELECT id FROM assets WHERE name LIKE 'Camión Volvo FH-001%'),
    (SELECT id FROM maintenance_types WHERE name = 'Mantenimiento Preventivo Completo'),
    (SELECT id FROM maintenance_personnel WHERE employee_code = 'MECH001'),
    'Mantenimiento Preventivo 45,000 km - Volvo FH-001',
    'Cambio completo de aceite motor y transmisión, revisión de filtros (aire, combustible, hidráulico), inspección de frenos y suspensión, verificación de sistemas eléctricos, diagnóstico computarizado.',
    'high',
    'pending',
    '2025-10-25 08:00:00-03',
    '2025-10-27 18:00:00-03',
    8,
    420000,
    45000,
    'WO-2025-001',
    '{"ultima_revision": "2025-07-20", "proxima_inspeccion": "2025-11-15", "items_criticos": ["frenos", "neumaticos"]}'
),
(
    gen_random_uuid()::text,
    (SELECT id FROM assets WHERE name LIKE 'Mercedes Actros A-002%'),
    (SELECT id FROM maintenance_types WHERE name = 'Reparación de Frenos'),
    (SELECT id FROM maintenance_personnel WHERE employee_code = 'MECH003'),
    'Reemplazo Pastillas y Discos Freno Delanteros - Actros A-002',
    'Reemplazo completo de pastillas y discos de freno delanteros. Revisión de circuito hidráulico, purga de líquido de frenos, calibración de sistema ABS.',
    'critical',
    'in_progress',
    '2025-10-23 09:00:00-03',
    '2025-10-24 17:00:00-03',
    6,
    280000,
    38000,
    'WO-2025-002',
    '{"desgaste_pastillas": "95%", "grosor_discos": "28mm", "liquido_frenos": "cambiar"}'
),
(
    gen_random_uuid()::text,
    (SELECT id FROM assets WHERE name LIKE 'Grúa Liebherr LTM-004%'),
    (SELECT id FROM maintenance_types WHERE name = 'Análisis de Vibraciones'),
    (SELECT id FROM maintenance_personnel WHERE employee_code = 'MECH002'),
    'Análisis Predictivo Sistema Hidráulico - Grúa LTM-004',
    'Análisis de vibraciones en sistema hidráulico principal y secundario. Medición de presiones, temperatura de aceite, análisis espectral de lubricantes.',
    'medium',
    'completed',
    '2025-10-20 10:00:00-03',
    '2025-10-22 16:00:00-03',
    3,
    150000,
    8500,
    'WO-2025-003',
    '{"resultado": "normal", "proxima_medicion": "2025-12-20", "recomendaciones": ["cambio_filtros_60_dias"]}'
),
(
    gen_random_uuid()::text,
    (SELECT id FROM assets WHERE name LIKE 'Scania P410 S-003%'),
    (SELECT id FROM maintenance_types WHERE name = 'Mantenimiento Preventivo Básico'),
    (SELECT id FROM maintenance_personnel WHERE employee_code = 'MECH004'),
    'Servicio 10,000 km - Scania P410 S-003',
    'Primer servicio programado: cambio de aceite motor, filtro de aceite, revisión de niveles, inspección visual general, actualización de software ECU.',
    'medium',
    'pending',
    '2025-10-26 14:00:00-03',
    '2025-10-28 12:00:00-03',
    4,
    180000,
    12000,
    'WO-2025-004',
    '{"primer_servicio": true, "garantia": "vigente", "km_siguiente_servicio": 20000}'
),
(
    gen_random_uuid()::text,
    (SELECT id FROM assets WHERE name LIKE 'Montacargas Clark C25-005%'),
    (SELECT id FROM maintenance_types WHERE name = 'Mantenimiento Preventivo Básico'),
    (SELECT id FROM maintenance_personnel WHERE employee_code = 'MECH005'),
    'Mantenimiento Quincenal - Montacargas Clark C25-005',
    'Revisión diaria intensiva: niveles de aceite hidráulico, estado de mangueras, funcionamiento de cadenas elevadoras, lubricación de puntos críticos, prueba de sistemas de seguridad.',
    'high',
    'pending',
    '2025-10-24 07:00:00-03',
    '2025-10-24 16:00:00-03',
    2,
    85000,
    NULL,
    'WO-2025-005',
    '{"uso_diario": "8_horas", "turno": "mañana", "operador_asignado": "Pedro_Sanchez"}'
);

-- Crear algunos checklists de mantenimiento
INSERT INTO maintenance_checklists (maintenance_type_id, name, checklist_items) VALUES
(
    (SELECT id FROM maintenance_types WHERE name = 'Mantenimiento Preventivo Completo'),
    'Checklist Mantenimiento Preventivo Camiones',
    '[
        {"item": "Verificar nivel de aceite motor", "tipo": "check", "critico": true},
        {"item": "Inspeccionar estado de filtros", "tipo": "check", "critico": true},
        {"item": "Medir presión de neumáticos", "tipo": "medicion", "unidad": "PSI", "min": 100, "max": 120},
        {"item": "Probar funcionamiento de frenos", "tipo": "prueba", "critico": true},
        {"item": "Verificar luces y señalización", "tipo": "check", "critico": false},
        {"item": "Inspeccionar correas y mangueras", "tipo": "visual", "critico": true},
        {"item": "Revisar niveles de fluidos", "tipo": "check", "critico": true},
        {"item": "Diagnóstico computarizado", "tipo": "diagnostico", "critico": true}
    ]'::text
),
(
    (SELECT id FROM maintenance_types WHERE name = 'Análisis de Vibraciones'),
    'Checklist Análisis Predictivo',
    '[
        {"item": "Configurar equipo de medición", "tipo": "setup", "critico": true},
        {"item": "Medir vibraciones en puntos críticos", "tipo": "medicion", "unidad": "mm/s", "max": 4.5},
        {"item": "Registrar temperatura de componentes", "tipo": "medicion", "unidad": "°C", "max": 80},
        {"item": "Tomar muestra de aceite", "tipo": "muestra", "critico": true},
        {"item": "Análisis espectral FFT", "tipo": "analisis", "critico": true},
        {"item": "Documentar anomalías", "tipo": "registro", "critico": true}
    ]'::text
);

COMMIT;