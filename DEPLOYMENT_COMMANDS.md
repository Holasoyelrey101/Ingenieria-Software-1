# 🚀 Comandos de Despliegue - ERP LuxChile

## ⚠️ IMPORTANTE: Iniciar Docker Primero

Docker no está corriendo actualmente. Antes de ejecutar los comandos, debes:

1. **Abrir Docker Desktop**
2. **Esperar a que inicie completamente**
3. **Verificar que está corriendo**:
   ```powershell
   docker ps
   ```

---

## 📋 Comandos a Ejecutar (en orden)

### 1. Verificar que Docker está corriendo
```powershell
docker ps
```

**Salida esperada**: Debe mostrar los contenedores (postgres, gateway, web, etc.)

---

### 2. Ejecutar Trigger SQL
```powershell
# Desde la raíz del proyecto
Get-Content "infra\sql\017_sync_delivery_cancellation.sql" | docker exec -i infra-postgres-1 psql -U lux -d erp
```

**Salida esperada**:
```
CREATE FUNCTION
DROP TRIGGER
CREATE TRIGGER
NOTICE:  ✅ Trigger sync_delivery_cancellation creado exitosamente
NOTICE:  📋 El trigger se ejecutará automáticamente cuando status cambie a "cancelado"
NOTICE:  🔧 Acciones: liberar vehículo, cancelar turno, resetear asignaciones, registrar auditoría
```

---

### 3. Reiniciar Servicios
```powershell
docker-compose restart gateway web
```

**Salida esperada**:
```
Restarting infra-gateway-1 ... done
Restarting infra-web-1 ... done
```

---

### 4. Verificar Logs (Opcional)
```powershell
# Ver logs del gateway
docker logs infra-gateway-1 --tail 50

# Ver logs del web
docker logs infra-web-1 --tail 50
```

---

## ✅ Pruebas

### Probar HU3: Preview de Ruta

1. Abrir `http://localhost:5173`
2. Seleccionar origen (ej: "Aeropuerto Santiago")
3. Seleccionar destino (ej: "Mall Plaza")
4. **✅ Verificar**: Aparece línea punteada azul claro automáticamente
5. **✅ Verificar**: Panel muestra "📏 X km, ⏱️ Y minutos"
6. Cambiar origen → Preview se actualiza automáticamente

### Probar HU2: Cancelación de Rutas

1. Ir a `http://localhost:5173/loads`
2. **✅ Verificar**: Se muestran 3 cards con métricas
3. **✅ Verificar**: Tabla muestra todas las cargas
4. Crear nueva ruta desde `/` (Rutas)
5. Volver a `/loads` → Nueva carga aparece como "Asignada"
6. Click en "❌ Cancelar Ruta"
7. Confirmar en diálogo
8. **✅ Verificar**: Estado cambia a "No asignada"

---

## 🔧 Troubleshooting

### Error: "Cannot connect to Docker daemon"
**Solución**: Iniciar Docker Desktop y esperar a que esté completamente iniciado.

### Error: "Container not found"
**Solución**: 
```powershell
# Iniciar todos los contenedores
docker-compose up -d
```

### Error al ejecutar SQL
**Solución alternativa** (ejecutar SQL manualmente):
```powershell
# Conectar a PostgreSQL
docker exec -it infra-postgres-1 psql -U lux -d erp

# Luego copiar y pegar el contenido de:
# infra/sql/017_sync_delivery_cancellation.sql
```

---

## 📚 Documentación Adicional

- **Walkthrough completo**: Ver `walkthrough.md` en artifacts
- **Configurar API Key**: Ver `HU4_API_KEY_SETUP.md`
- **Plan de implementación**: Ver `implementation_plan.md` en artifacts
