# 🔄 Flujo de Turnos Dinámicos - Lógica Mejorada

## 📋 Estados del Sistema

### **Status de Turnos Dinámicos**

| Status | Significado | Visible en | Acción Usuario |
|--------|-------------|-----------|----------------|
| `pendiente` | Ruta calculada pero **NO confirmada** por RR.HH. | "Rutas sin Asignar" | Asignar conductor |
| `asignado` | Turno **confirmado** por RR.HH. con conductor | "Horarios del Día" | Desasignar / Completar |
| `completado` | Turno finalizado exitosamente | Historial | Ver detalles |
| `cancelado` | Turno cancelado por el sistema | Historial | Ver razón |

---

## 🚀 Flujo Completo (Paso a Paso)

### **Paso 1: Usuario Calcula Ruta (MapView)**

**Acción**: Usuario selecciona origen, destino, conductor y hace clic en "Calcular Ruta"

**Backend**:
```python
POST /api/routes/assign
```

**Crea**:
1. `delivery_requests` con `status='pending'` (ruta calculada)
2. `dynamic_shifts` con `status='pendiente'` (NO confirmado por RR.HH.)
3. `dynamic_shift_assignments` con `status='pendiente'`

**Estado**:
- ✅ Ruta guardada en BD
- ⚠️ **NO aparece en calendario** (status='pendiente')
- ✅ **Aparece en "Rutas sin Asignar"**

---

### **Paso 2: Usuario Acepta Ruta (MapView)**

**Acción**: Usuario revisa la ruta calculada y hace clic en "✅ Aceptar y Guardar Ruta"

**Backend**:
```python
POST /api/rrhh/sync-route
```

**Mantiene**:
- `dynamic_shifts.status = 'pendiente'` (esperando confirmación RR.HH.)
- `delivery_requests.status = 'assigned'`

**Estado**:
- ✅ Ruta confirmada por usuario
- ⚠️ **Aún NO aparece en calendario**
- ✅ **Sigue en "Rutas sin Asignar"** (esperando confirmación RR.HH.)

---

### **Paso 3: Administrador RR.HH. Asigna Conductor**

**Acción**: Administrador abre "Rutas sin Asignar", expande la ruta y hace clic en "✓ Asignar"

**Backend**:
```python
POST /api/rrhh/dynamic-shifts/{id}/auto-assign?employee_id={id}
```

**Actualiza**:
1. `dynamic_shifts.status = 'asignado'` ✅ **CONFIRMADO**
2. `dynamic_shifts.assigned_at = NOW()`
3. `dynamic_shift_assignments.status = 'asignado'`
4. `delivery_requests.driver_id = {nuevo_conductor}`
5. `delivery_requests.status = 'assigned'`

**Estado**:
- ✅ **Turno confirmado por RR.HH.**
- ✅ **Aparece en "Horarios del Día"** (calendario)
- ❌ **Desaparece de "Rutas sin Asignar"**

---

### **Paso 4: Administrador Desasigna Turno (Opcional)**

**Acción**: Desde "Horarios del Día", hace clic en "✕ Desasignar"

**Backend**:
```python
DELETE /api/rrhh/dynamic-shifts/{id}/unassign
```

**Actualiza**:
1. `dynamic_shifts.status = 'pendiente'` ⚠️ **Vuelve a pendiente**
2. `dynamic_shift_assignments.status = 'pendiente'`

**Estado**:
- ⚠️ Turno regresa a estado pendiente
- ❌ **Desaparece del calendario**
- ✅ **Reaparece en "Rutas sin Asignar"**

---

### **Paso 5: Limpieza Automática (Cron Job)**

**Acción**: Sistema ejecuta limpieza periódica (cada 24 horas)

**Backend**:
```python
DELETE /api/rrhh/dynamic-shifts/cleanup
```

**Elimina**:
- Turnos con `status='pendiente'` creados hace más de 24 horas
- Cascadea a `delivery_requests` (si tiene FK ON DELETE CASCADE)

**Estado**:
- 🗑️ Turnos antiguos no confirmados eliminados
- ✅ Base de datos limpia

---

## 🎯 Ventajas de Esta Lógica

### ✅ **Separación de Responsabilidades**
- **MapView**: Calcula y guarda rutas
- **RR.HH.**: Confirma y asigna conductores

### ✅ **Trazabilidad Completa**
- Todos los cambios registrados en `audit_log`
- Timestamps: `created_at`, `assigned_at`, `completed_at`

### ✅ **Sincronización Automática**
- Triggers mantienen `delivery_requests` y `dynamic_shifts` alineados
- Cambiar status en uno → actualiza el otro

### ✅ **Limpieza Automática**
- Turnos no confirmados se eliminan después de 24 horas
- Evita acumulación de basura en BD

### ✅ **Estado Claro**
- `pendiente` = Esperando confirmación RR.HH.
- `asignado` = Confirmado y en calendario
- `completado` = Finalizado
- `cancelado` = Cancelado

---

## 📊 Vista Consolidada (v_route_traceability)

```sql
SELECT * FROM v_route_traceability;
```

**Muestra**:
- delivery_request_id
- dynamic_shift_id
- delivery_status
- shift_status
- conductor_nombre
- trazabilidad_status (OK / ⚠ INCONSISTENTE)

---

## 🔧 Endpoints API

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/rrhh/dynamic-shifts/pending` | Lista turnos pendientes (sin confirmar) |
| GET | `/api/rrhh/dynamic-shifts` | Lista todos los turnos |
| POST | `/api/rrhh/dynamic-shifts/{id}/auto-assign` | Confirma turno y asigna conductor |
| DELETE | `/api/rrhh/dynamic-shifts/{id}/unassign` | Desasigna conductor (vuelve a pendiente) |
| DELETE | `/api/rrhh/dynamic-shifts/cleanup` | Elimina turnos pendientes antiguos |
| POST | `/api/rrhh/sync-route` | Sincroniza ruta con RR.HH. (crea turno pendiente) |

---

## 💡 Mejoras Futuras Sugeridas

1. **Notificaciones**: Email/SMS cuando un turno queda pendiente > 12 horas
2. **Dashboard**: Métrica de "Turnos sin confirmar" en panel de administración
3. **Auto-asignación inteligente**: Algoritmo que sugiere el mejor conductor
4. **Historial de cambios**: Ver quién asignó/desasignó cada turno
5. **Validaciones**: No permitir asignar conductor si ya tiene 5h de conducción

---

## 🐛 Troubleshooting

### Problema: "Turnos no aparecen en calendario"
**Solución**: Verificar que `status='asignado'` (no 'pendiente')

### Problema: "Turnos duplicados en 'Rutas sin Asignar'"
**Solución**: Ejecutar `DELETE /api/rrhh/dynamic-shifts/cleanup`

### Problema: "Desasignar no funciona"
**Solución**: Verificar que existe `dynamic_shift_assignments` para ese turno

---

## 📝 Logs Útiles

```bash
# Ver turnos pendientes
docker exec infra-postgres-1 psql -U lux -d erp -c "SELECT id, route_id, status, created_at FROM dynamic_shifts WHERE status='pendiente';"

# Ver trazabilidad completa
docker exec infra-postgres-1 psql -U lux -d erp -c "SELECT * FROM v_route_traceability;"

# Ver audit log
docker exec infra-postgres-1 psql -U lux -d erp -c "SELECT * FROM audit_log ORDER BY changed_at DESC LIMIT 10;"
```

---

## ✅ Checklist de Implementación

- [x] Crear endpoint `/dynamic-shifts/pending` con filtro correcto
- [x] Cambiar `sync-route` para crear con `status='pendiente'`
- [x] Actualizar `auto-assign` para cambiar a `status='asignado'`
- [x] Crear endpoint `/cleanup` para eliminar antiguos
- [x] Agregar triggers de sincronización bidireccional
- [x] Crear vista `v_route_traceability`
- [x] Crear tabla `audit_log` universal
- [ ] **PENDIENTE**: Agregar cron job para ejecutar `/cleanup` cada 24h
- [ ] **PENDIENTE**: Agregar notificaciones para turnos > 12h sin confirmar
- [ ] **PENDIENTE**: Dashboard con métricas de turnos pendientes

---

**Fecha**: 2025-11-08  
**Autor**: Sistema de Trazabilidad Mejorada  
**Versión**: 2.0
