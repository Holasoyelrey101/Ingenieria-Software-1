# SQL Migration Files

Los archivos SQL en este directorio se ejecutan **automáticamente** al levantar el contenedor de PostgreSQL por primera vez.

## Orden de Ejecución

PostgreSQL ejecuta los archivos en orden alfabético desde `/docker-entrypoint-initdb.d/`:

### 1. Schema Base (001-005)
- `001_init_schema.sql` - Tablas base del sistema
- `002_logistica_base.sql` - Esquema de logística
- `003_incidents_add_vehicle_driver.sql` - Sistema de incidentes
- `004_incidents_link_delivery_request.sql` - Link entre incidentes y entregas
- `005_maintenance_system.sql` - Sistema de mantenimiento
- `005_rrhh_schema.sql` - Esquema de recursos humanos

### 2. Seeds y Data (006-007)
- `006_maintenance_demo_data_safe.sql` - Datos de demo para mantenimiento
- `006_maintenance_reminders.sql` - Sistema de recordatorios
- `006_rrhh_seed.sql` - Datos iniciales de RRHH
- `007_luxury_transport_vehicles.sql` - Vehículos de lujo
- `007_rrhh_roles.sql` - Roles de RRHH

### 3. Features Avanzadas (008-009)
- `008_maintenance_tasks_clean.sql` - Limpieza de tareas
- `009_dynamic_reminders_system.sql` - Sistema de recordatorios dinámicos

### 4. Trazabilidad y FKs (013-014) ⭐ CRÍTICO
- `013_sync_foreign_keys.sql` - Foreign keys básicas entre delivery_requests ↔ employees/vehicles
- `014_full_traceability.sql` - **Sistema completo de trazabilidad**
  - **59 Foreign Keys** con ON DELETE CASCADE
  - **14 Triggers** de sincronización bidireccional
  - Vista: v_route_traceability para debugging
  - Garantiza: Si se elimina delivery_request → se eliminan dynamic_shifts relacionados

### 5. Seed Final
- `seed_clean.sql` - Datos limpios de prueba

## Estado Actual del Sistema

✅ **43 tablas** creadas automáticamente
✅ **59 Foreign Keys** con CASCADE
✅ **14 Triggers** para sincronización automática
✅ Sistema de turnos dinámicos funcional
✅ Trazabilidad completa entre módulos

## Importante

⚠️ **NO modificar el orden numérico de los archivos** - El sistema depende del orden alfabético para la ejecución correcta.

⚠️ **Limpiar volumen antes de reiniciar**: Si necesitas reiniciar la base de datos desde cero:
```bash
cd infra
docker-compose down -v  # Elimina volúmenes
docker-compose up -d    # Recrea todo desde cero
```

## Estado Actual del Sistema

✅ Trazabilidad completa implementada
✅ 59 Foreign Keys con CASCADE
✅ 115 Índices para performance
✅ 288 Triggers para sincronización automática
✅ Sistema de turnos dinámicos funcional
