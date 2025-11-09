# Guía de Verificación - HU6: Vehicle Cameras

Esta guía te ayudará a verificar visualmente todos los cambios implementados para conectar cámaras con vehículos.

## 📋 Prerrequisitos

1. **Docker Desktop debe estar corriendo**
2. **Base de datos PostgreSQL debe estar activa**
3. **Servicios backend y frontend deben estar corriendo**

## 🚀 Pasos de Verificación

### Paso 1: Aplicar el Script SQL

El script SQL se ejecuta automáticamente si es la primera vez que creas la base de datos. Si la base ya existe, necesitas ejecutarlo manualmente:

**Opción A: Ejecutar manualmente en PostgreSQL**

```powershell
# Conectar a la base de datos
docker exec -it infra-postgres-1 psql -U lux -d erp

# Dentro de psql, ejecutar:
\i /docker-entrypoint-initdb.d/006_vehicle_cameras.sql
# O copiar y pegar el contenido del archivo
```

**Opción B: Reinicializar la base de datos (⚠️ BORRA TODOS LOS DATOS)**

```powershell
cd infra
docker compose down -v
docker compose up -d postgres
# Espera unos segundos para que se ejecuten todos los scripts SQL
```

**Opción C: Ejecutar directamente desde archivo**

```powershell
# Desde la raíz del proyecto
Get-Content infra/sql/006_vehicle_cameras.sql | docker exec -i infra-postgres-1 psql -U lux -d erp
```

### Paso 2: Verificar la Tabla en la Base de Datos

```powershell
# Verificar que la tabla existe
docker exec -it infra-postgres-1 psql -U lux -d erp -c "\d vehicle_cameras"

# Ver los datos de ejemplo
docker exec -it infra-postgres-1 psql -U lux -d erp -c "SELECT * FROM vehicle_cameras;"
```

Deberías ver:
- La estructura de la tabla con todos los campos
- Al menos 2 registros (cam1 y cam2 asignados a VH001)

### Paso 3: Verificar que el Backend Esté Corriendo

```powershell
# Verificar salud del backend
curl http://localhost:8000/health

# O en PowerShell:
Invoke-WebRequest -Uri http://localhost:8000/health
```

### Paso 4: Probar los Nuevos Endpoints

**4.1. Listar todas las asignaciones:**
```powershell
Invoke-WebRequest -Uri "http://localhost:8000/camaras/assignments" | Select-Object -ExpandProperty Content
```

**4.2. Obtener cámaras de un vehículo (asumiendo que VH001 tiene id=1):**
```powershell
Invoke-WebRequest -Uri "http://localhost:8000/camaras/vehicles/1/cameras" | Select-Object -ExpandProperty Content
```

**4.3. Probar asignar una cámara (ejemplo):**
```powershell
$body = @{
    camera_id = "cam1"
    camera_name = "Cámara Frontal"
    position = "frontal"
    active = $true
} | ConvertTo-Json

Invoke-WebRequest -Uri "http://localhost:8000/camaras/vehicles/1/cameras" `
    -Method POST `
    -ContentType "application/json" `
    -Body $body
```

### Paso 5: Verificar el Frontend

1. **Abrir el navegador en:** http://localhost:5173

2. **Navegar a la nueva página:**
   - En el sidebar izquierdo, buscar "Seguridad"
   - Hacer clic en "⚙️ Gestión de Cámaras"
   - O ir directamente a: http://localhost:5173/seguridad/vehiculos-camaras

3. **Verificar la interfaz:**
   - ✅ Debe aparecer un selector de vehículos
   - ✅ Al seleccionar un vehículo, deben aparecer sus cámaras asignadas
   - ✅ Debe haber botones para asignar nuevas cámaras
   - ✅ Cada cámara asignada debe tener un botón "Desasignar"

4. **Probar funcionalidad:**
   - Seleccionar un vehículo
   - Asignar una cámara nueva
   - Verificar que aparece en la lista
   - Desasignar una cámara
   - Verificar que desaparece de la lista

### Paso 6: Verificar que No Se Rompió Nada

1. **Verificar página de cámaras existente:**
   - Ir a: http://localhost:5173/seguridad/camaras
   - ✅ Debe seguir mostrando todas las cámaras en vivo
   - ✅ Los streams deben funcionar normalmente

2. **Verificar otros endpoints:**
   ```powershell
   # Listar cámaras
   Invoke-WebRequest -Uri "http://localhost:8000/camaras/list"
   
   # Health check de cámaras
   Invoke-WebRequest -Uri "http://localhost:8000/camaras/health"
   ```

## 🔍 Verificación Rápida con Script

Ejecuta el script de verificación automática:

```powershell
.\scripts\verificar_vehicle_cameras.ps1
```

Este script verificará:
- ✅ Existencia de archivos
- ✅ Backend funcionando
- ✅ Endpoints respondiendo
- ✅ Frontend accesible

## 🐛 Solución de Problemas

### Error: "Backend no está corriendo"
```powershell
cd infra
docker compose up -d gateway
docker compose logs -f gateway
```

### Error: "Tabla vehicle_cameras no existe"
- Verifica que el script SQL se ejecutó correctamente
- Revisa los logs de PostgreSQL: `docker compose logs postgres`

### Error: "No se ven vehículos en el selector"
- Verifica que existan vehículos en la tabla `vehicles`
- Puedes insertar uno de prueba:
  ```sql
  INSERT INTO vehicles (code, capacity_kg, active) 
  VALUES ('VH001', 5000, true) 
  ON CONFLICT (code) DO NOTHING;
  ```

### Error: "404 en los endpoints"
- Verifica que el router esté incluido en `main.py`
- Reinicia el servicio gateway: `docker compose restart gateway`

## ✅ Checklist de Verificación Completa

- [ ] Script SQL ejecutado sin errores
- [ ] Tabla `vehicle_cameras` existe en la base de datos
- [ ] Datos de ejemplo (cam1, cam2) están asignados a VH001
- [ ] Endpoint `/camaras/assignments` responde
- [ ] Endpoint `/camaras/vehicles/{id}/cameras` responde
- [ ] Página de gestión aparece en el sidebar
- [ ] Selector de vehículos funciona
- [ ] Se pueden asignar cámaras
- [ ] Se pueden desasignar cámaras
- [ ] Página de cámaras existente sigue funcionando
- [ ] No hay errores en la consola del navegador

## 📸 Capturas de Pantalla Esperadas

1. **Página de Gestión:**
   - Selector de vehículos en la parte superior
   - Lista de cámaras asignadas al vehículo seleccionado
   - Botones para asignar cámaras disponibles

2. **Después de asignar una cámara:**
   - La cámara aparece en la lista de asignadas
   - El botón de asignar desaparece de las opciones disponibles

3. **En la base de datos:**
   - Registros en `vehicle_cameras` con `vehicle_id`, `camera_id`, `position`, etc.

## 🎯 Próximos Pasos

Una vez verificado todo:
1. Probar con diferentes vehículos
2. Asignar múltiples cámaras al mismo vehículo
3. Verificar que las posiciones (frontal, trasera, etc.) se guardan correctamente
4. Probar el componente `VehicleCameraView` en otras páginas si es necesario

