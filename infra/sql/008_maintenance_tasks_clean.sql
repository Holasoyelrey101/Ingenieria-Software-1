-- ======================================================
-- TAREAS DE MANTENIMIENTO PARA VEHICULOS DE LUJO BLINDADO
-- Complementa el archivo 008 con tareas SIN caracteres especiales
-- ======================================================

-- Limpiar tareas de mantenimiento existentes
DELETE FROM maintenance_reminders;
DELETE FROM maintenance_task_parts;
DELETE FROM maintenance_history;
DELETE FROM maintenance_tasks;

-- Insertar tareas de mantenimiento SIN caracteres especiales
-- Usando los IDs de assets del archivo 008
DO $$
DECLARE
    asset_ids INTEGER[];
    mech1_id INTEGER;
    mech2_id INTEGER;
    mech3_id INTEGER;
    mech4_id INTEGER;
    mech5_id INTEGER;
    mt_preventive_basic INTEGER;
    mt_preventive_full INTEGER;
    mt_corrective_repair INTEGER;
    mt_predictive INTEGER;
BEGIN
    -- Obtener array de IDs de assets en orden
    SELECT ARRAY(SELECT id FROM assets ORDER BY id) INTO asset_ids;
    
    -- Obtener IDs de personal de mantenimiento
    SELECT id INTO mech1_id FROM maintenance_personnel WHERE employee_code = 'MECH001';
    SELECT id INTO mech2_id FROM maintenance_personnel WHERE employee_code = 'MECH002';
    SELECT id INTO mech3_id FROM maintenance_personnel WHERE employee_code = 'MECH003';
    SELECT id INTO mech4_id FROM maintenance_personnel WHERE employee_code = 'MECH004';
    SELECT id INTO mech5_id FROM maintenance_personnel WHERE employee_code = 'MECH005';
    
    -- Obtener IDs de tipos de mantenimiento
    SELECT id INTO mt_preventive_basic FROM maintenance_types WHERE name = 'Mantenimiento Preventivo Basico';
    SELECT id INTO mt_preventive_full FROM maintenance_types WHERE name = 'Mantenimiento Preventivo Completo';
    SELECT id INTO mt_corrective_repair FROM maintenance_types WHERE name = 'Reparacion de Motor';
    SELECT id INTO mt_predictive FROM maintenance_types WHERE name = 'Analisis de Vibraciones';
    
    -- Insertar tareas usando los IDs reales con task_code unico
    INSERT INTO maintenance_tasks (id, task_code, asset_id, maintenance_type_id, assigned_to, title, description, priority, status, scheduled_date, due_date, estimated_duration, created_at) VALUES
    -- Tareas en progreso
    (gen_random_uuid(), 'MT-001-2025', asset_ids[7], mt_predictive, mech2_id, 'Actualizacion firmware camaras 4K Mercedes EQS', 'Actualizacion firmware camaras 4K, sistema GPS anti-jamming y sensores de intrusion', 'medium', 'in_progress', '2025-10-24', '2025-10-24', 3, NOW()),
    (gen_random_uuid(), 'MT-002-2025', asset_ids[8], mt_preventive_full, mech1_id, 'Actualizacion sistema blindaje Scania R450', 'Actualizacion firmware camaras 4K, sistema GPS anti-jamming y sensores de intrusion', 'medium', 'in_progress', '2025-10-24', '2025-10-24', 3, NOW()),
    
    
    -- Tareas pendientes proximas
    (gen_random_uuid(), 'MT-003-2025', asset_ids[1], mt_preventive_full, mech1_id, 'Revision sistema blindaje Volvo', 'Revision sistema blindaje, camaras de seguridad, GPS tracking, sistema de carga refrigerada para objetos de lujo', 'high', 'pending', '2025-10-25', '2025-10-26', 4, NOW()),
    (gen_random_uuid(), 'MT-004-2025', asset_ids[2], mt_predictive, mech2_id, 'Calibracion camaras 360 Mercedes Actros', 'Calibracion camaras 360 grados, sensores de movimiento, sistemas de alarma para transporte seguro de articulos valiosos', 'medium', 'pending', '2025-10-24', '2025-10-25', 6, NOW()),
    (gen_random_uuid(), 'MT-005-2025', asset_ids[3], mt_preventive_full, mech3_id, 'Verificacion integridad blindaje Mercedes V-003', 'Verificacion integridad blindaje, pruebas sistema anti-robo, revision camaras HD para proteccion cargo', 'medium', 'pending', '2025-10-26', '2025-10-27', 4, NOW()),
    (gen_random_uuid(), 'MT-006-2025', asset_ids[4], mt_predictive, mech2_id, 'Actualizacion software camaras HD Sprinter', 'Actualizacion software camaras HD, pruebas sistema de rastreo GPS, revision compartimento blindado para transporte seguro', 'high', 'pending', '2025-10-26', '2025-10-27', 5, NOW()),
    (gen_random_uuid(), 'MT-007-2025', asset_ids[5], mt_predictive, mech4_id, 'Calibracion sensores anti-vibracion Montacargas', 'Calibracion sensores anti-vibracion para manejo seguro de objetos fragiles de alto valor', 'high', 'pending', '2025-10-24', '2025-10-24', 4, NOW()),
    (gen_random_uuid(), 'MT-008-2025', asset_ids[6], mt_preventive_basic, mech3_id, 'Verificacion sistemas seguridad perimetral Audi Q8', 'Verificacion sistemas de seguridad perimetral, pruebas camaras termicas, revision compartimento antirrobo para objetos de alto valor', 'medium', 'pending', '2025-10-26', '2025-10-27', 3, NOW()),
    (gen_random_uuid(), 'MT-009-2025', asset_ids[7], mt_preventive_full, mech2_id, 'Revision bateria blindada Mercedes EQS', 'Revision bateria blindada, sistemas de carga segura, actualizacion software camaras AI y sensores anti-interferencia', 'high', 'pending', '2025-10-26', '2025-10-27', 6, NOW()),
    (gen_random_uuid(), 'MT-010-2025', asset_ids[8], mt_corrective_repair, mech1_id, 'Reparacion sistema refrigeracion Scania', 'Reparacion sistema refrigeracion blindado, mantenimiento camaras criogenicas para transporte de obras de arte y joyas', 'high', 'pending', '2025-10-26', '2025-10-27', 8, NOW()),
    
    
    -- Tareas vencidas (CRITICAS)
    (gen_random_uuid(), 'MT-011-2025', asset_ids[1], mt_corrective_repair, mech1_id, 'URGENTE: Revision Sistema Blindaje - Volvo SecureTransport', 'Mantenimiento critico VENCIDO - Compromete seguridad del cargo de alto valor', 'critical', 'pending', '2025-10-10', '2025-10-18', 8, NOW()),
    (gen_random_uuid(), 'MT-012-2025', asset_ids[2], mt_corrective_repair, mech3_id, 'URGENTE: Mantenimiento Critico Frenos - Mercedes SecureCargo', 'Mantenimiento critico VENCIDO - Compromete seguridad del cargo de alto valor', 'critical', 'pending', '2025-10-10', '2025-10-18', 6, NOW()),
    (gen_random_uuid(), 'MT-013-2025', asset_ids[3], mt_predictive, mech2_id, 'URGENTE: Calibracion Camaras - Furgon Mercedes LuxSecure', 'Mantenimiento critico VENCIDO - Compromete seguridad del cargo de alto valor', 'critical', 'pending', '2025-10-12', '2025-10-18', 3, NOW()),
    (gen_random_uuid(), 'MT-014-2025', asset_ids[4], mt_preventive_full, mech2_id, 'URGENTE: Actualizacion Seguridad - Mercedes Sprinter', 'Mantenimiento critico VENCIDO - Compromete seguridad del cargo de alto valor', 'critical', 'pending', '2025-10-12', '2025-10-18', 4, NOW()),
    (gen_random_uuid(), 'MT-015-2025', asset_ids[5], mt_predictive, mech4_id, 'URGENTE: Calibracion Sistema Electrico - Montacargas Blindado', 'Mantenimiento critico VENCIDO - Compromete seguridad del cargo de alto valor', 'critical', 'pending', '2025-10-15', '2025-10-18', 4, NOW()),
    (gen_random_uuid(), 'MT-016-2025', asset_ids[6], mt_preventive_full, mech3_id, 'URGENTE: Inspeccion Blindaje - Furgon Audi Q8 VIP', 'Mantenimiento critico VENCIDO - Compromete seguridad del cargo de alto valor', 'critical', 'pending', '2025-10-15', '2025-10-18', 3, NOW()),
    (gen_random_uuid(), 'MT-017-2025', asset_ids[7], mt_predictive, mech2_id, 'URGENTE: Actualizacion Seguridad - Mercedes EQS SecureLux', 'Mantenimiento critico VENCIDO - Compromete seguridad del cargo de alto valor', 'critical', 'pending', '2025-10-08', '2025-10-18', 4, NOW()),
    
    
    -- Tareas adicionales para generar mas datos
    (gen_random_uuid(), 'MT-018-2025', asset_ids[5], mt_predictive, mech4_id, 'Actualizacion firmware camaras 4K Montacargas', 'Actualizacion firmware camaras 4K, sistema GPS anti-jamming y sensores de intrusion', 'medium', 'pending', '2025-10-24', '2025-10-24', 2, NOW()),
    (gen_random_uuid(), 'MT-019-2025', asset_ids[6], mt_predictive, mech2_id, 'Actualizacion firmware camaras 4K Audi Q8', 'Actualizacion firmware camaras 4K, sistema GPS anti-jamming y sensores de intrusion', 'medium', 'pending', '2025-10-24', '2025-10-24', 2, NOW()),
    
    
    -- Tareas completadas
    (gen_random_uuid(), 'MT-020-2025', asset_ids[1], mt_preventive_full, mech1_id, 'Certificacion nivel 3 transporte blindado Volvo', 'Certificacion nivel 3 para transporte blindado de articulos de extremo valor', 'high', 'completed', '2025-10-15', '2025-10-18', 8, NOW()),
    (gen_random_uuid(), 'MT-021-2025', asset_ids[2], mt_preventive_full, mech1_id, 'Certificacion nivel 3 transporte blindado Mercedes', 'Certificacion nivel 3 para transporte blindado de articulos de extremo valor', 'high', 'completed', '2025-10-15', '2025-10-18', 6, NOW()),
    (gen_random_uuid(), 'MT-022-2025', asset_ids[3], mt_preventive_basic, mech3_id, 'Certificacion nivel 3 transporte blindado Furgon', 'Certificacion nivel 3 para transporte blindado de articulos de extremo valor', 'high', 'completed', '2025-10-15', '2025-10-18', 4, NOW()),
    (gen_random_uuid(), 'MT-023-2025', asset_ids[4], mt_predictive, mech2_id, 'Actualizacion firmware camaras 4K Sprinter COMPLETADO', 'Actualizacion firmware camaras 4K, sistema GPS anti-jamming y sensores de intrusion', 'medium', 'completed', '2025-10-20', '2025-10-24', 3, NOW());

EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Maintenance tasks insert skipped: %', SQLERRM;
END $$;

COMMIT;