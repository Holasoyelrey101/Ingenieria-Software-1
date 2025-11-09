# 🔀 PLAN DE MERGEO - HU6: Cámaras en Vivo

## 📋 RESUMEN EJECUTIVO

**PR**: `feat/HU6-camaras` → `IS1-105-Fix-HU4-Visualizar-ruta-asignada`  
**Autor**: Compañero  
**Archivos modificados**: 46 archivos  
**Líneas cambiadas**: ~500 líneas  
**Riesgo de conflicto**: 🟡 MEDIO (1 archivo compartido: `gateway/app/main.py`)  

---

## 🔍 AUDITORÍA INICIAL

### ✅ **Cambios Nuevos** (Sin conflicto)
```
✅ Nuevo servicio: mediamtx (streaming RTSP/HLS)
✅ Nueva tabla: vehicle_cameras (relación vehículo-cámara)
✅ Nuevo módulo backend: gateway/app/routers/camaras.py
✅ Nuevo módulo frontend: web/src/pages/CamarasPage.tsx
✅ Nuevos componentes: VideoHLS.tsx, VehicleCameraView.tsx
✅ Nueva API: web/src/api/camaras.ts
✅ Scripts de verificación: hu6-check.ps1
```

### ⚠️ **Cambios Compartidos** (Requieren merge manual)
```
⚠️ gateway/app/main.py (51 líneas modificadas)
   - Tu HU4: Endpoints de incidentes, turnos, delivery_requests
   - Su HU6: Imports de routers, configuración de cámaras
   - CONFLICTO: Posible en imports y configuración inicial

⚠️ infra/docker-compose.yaml
   - Tu HU4: healthcheck en postgres
   - Su HU6: servicio mediamtx + test-pub + test-pub2
   - CONFLICTO: Bajo (cambios en secciones diferentes)

⚠️ gateway/requirements.txt
   - Su HU6: Posibles nuevas dependencias
   - CONFLICTO: Bajo (append)
```

### 🗑️ **Archivos Basura** (Eliminar antes de mergear)
```
❌ gateway/app/main.py.backup
❌ infra/docker-compose.yaml.backup
❌ infra/docker-compose.yaml.backup3
❌ infra/docker-compose.yaml.bak
❌ infra/_effective.yml
❌ Ingenieria-Software-1-main (carpeta duplicada?)
❌ patch_gateway.py
```

---

## 📅 PLAN DE EJECUCIÓN (6 FASES)

### **FASE 1: PREPARACIÓN** ⏱️ 5 min
**Objetivo**: Crear ambiente seguro de pruebas

```powershell
# 1.1 - Backup del estado actual
git stash push -m "HU4 backup antes de merge HU6"

# 1.2 - Crear branch de integración
git checkout -b integrate/HU4+HU6
git branch --set-upstream-to=origin/IS1-105-Fix-HU4-Visualizar-ruta-asignada

# 1.3 - Verificar estado limpio
git status
```

**Criterio de éxito**: ✅ Branch nuevo creado sin cambios pendientes

---

### **FASE 2: MERGE INICIAL** ⏱️ 10 min
**Objetivo**: Integrar cambios automáticos

```powershell
# 2.1 - Merge con estrategia conservadora
git merge origin/feat/HU6-camaras --no-ff --no-commit

# 2.2 - Verificar conflictos
git status | Select-String "conflict"
```

**Conflictos esperados**:
- ✅ `gateway/app/main.py` (imports y configuración)
- ✅ `infra/docker-compose.yaml` (posible en formato YAML)

**Criterio de éxito**: ✅ Conflictos identificados y listados

---

### **FASE 3: RESOLUCIÓN DE CONFLICTOS** ⏱️ 20 min
**Objetivo**: Resolver conflictos manualmente manteniendo AMBAS funcionalidades

#### **3.1 - gateway/app/main.py**

**Estrategia**: COMBINAR imports y mantener endpoints de HU4 + HU6

```python
# ===== SECCIÓN IMPORTS =====
# MANTENER de HU4:
from . import models
from .db import get_db

# AGREGAR de HU6:
from .routers import camaras as camaras_router

# ===== SECCIÓN ROUTERS =====
# AGREGAR después de tus endpoints:
app.include_router(camaras_router.router, prefix="/api/camaras", tags=["camaras"])
```

**Acción**:
```powershell
# Resolver conflicto manualmente en VS Code
code gateway/app/main.py

# Marcar como resuelto
git add gateway/app/main.py
```

#### **3.2 - infra/docker-compose.yaml**

**Estrategia**: AGREGAR servicios nuevos sin tocar existentes

```yaml
services:
  postgres:
    # ... TU CONFIGURACIÓN (healthcheck) ...
  
  gateway:
    # ... TU CONFIGURACIÓN ...
  
  # AGREGAR de HU6:
  mediamtx:
    image: bluenviron/mediamtx:latest
    ports:
      - "8554:8554"
      - "8888:8888"
    volumes:
      - ./mediamtx/mediamtx.yml:/mediamtx.yml:ro
    restart: unless-stopped
  
  test-pub:
    # ... CONFIGURACIÓN COMPLETA DE HU6 ...
```

**Acción**:
```powershell
git add infra/docker-compose.yaml
```

**Criterio de éxito**: ✅ Conflictos resueltos, archivos staged

---

### **FASE 4: LIMPIEZA DE ARCHIVOS BASURA** ⏱️ 5 min
**Objetivo**: Eliminar archivos temporales/backup

```powershell
# 4.1 - Eliminar backups
git rm gateway/app/main.py.backup
git rm infra/docker-compose.yaml.backup
git rm infra/docker-compose.yaml.backup3
git rm infra/docker-compose.yaml.bak
git rm infra/_effective.yml
git rm patch_gateway.py

# 4.2 - Revisar carpeta sospechosa
if (Test-Path "Ingenieria-Software-1-main") {
    Remove-Item -Recurse -Force "Ingenieria-Software-1-main"
    git rm -r Ingenieria-Software-1-main
}

# 4.3 - Commit de limpieza
git add -A
git status
```

**Criterio de éxito**: ✅ Solo archivos funcionales en el merge

---

### **FASE 5: APLICACIÓN SQL Y TESTING** ⏱️ 15 min
**Objetivo**: Aplicar schema de cámaras y verificar servicios

```powershell
# 5.1 - Bajar servicios actuales
cd infra
docker-compose down

# 5.2 - Aplicar SQL de cámaras
docker-compose up -d postgres
Start-Sleep -Seconds 10

$content = Get-Content "../infra/sql/006_vehicle_cameras.sql" -Raw
$content | docker exec -i infra-postgres-1 psql -U lux -d erp

# 5.3 - Verificar tabla creada
docker exec infra-postgres-1 psql -U lux -d erp -c "\d vehicle_cameras"

# 5.4 - Levantar todos los servicios (incluido mediamtx)
docker-compose up -d --build

# 5.5 - Verificar servicios
docker ps --filter "name=infra" --format "table {{.Names}}\t{{.Status}}"

# 5.6 - Esperar inicialización
Start-Sleep -Seconds 15
```

**Criterio de éxito**: 
- ✅ Tabla `vehicle_cameras` existe
- ✅ Servicio `mediamtx` corriendo (puertos 8554, 8888)
- ✅ Streams `cam1` y `cam2` disponibles

---

### **FASE 6: VERIFICACIÓN FUNCIONAL** ⏱️ 20 min
**Objetivo**: Probar que HU4 + HU6 funcionan juntos

#### **6.1 - Verificar HU4 (TUS endpoints)**

```powershell
# Empleados
Invoke-WebRequest -Uri "http://localhost:8000/api/rrhh/employees" -UseBasicParsing | 
    Select-Object StatusCode

# Turnos dinámicos
Invoke-WebRequest -Uri "http://localhost:8000/api/rrhh/dynamic-shifts" -UseBasicParsing | 
    Select-Object StatusCode

# Delivery requests
Invoke-WebRequest -Uri "http://localhost:8000/api/delivery-requests" -UseBasicParsing | 
    Select-Object StatusCode

# Incidentes
Invoke-WebRequest -Uri "http://localhost:8000/api/incidents" -UseBasicParsing | 
    Select-Object StatusCode
```

**Esperado**: Todos 200 OK

#### **6.2 - Verificar HU6 (Endpoints de cámaras)**

```powershell
# Listar cámaras
Invoke-WebRequest -Uri "http://localhost:8000/api/camaras/vehicle_cameras" -UseBasicParsing | 
    Select-Object StatusCode

# Stream HLS cam1
Invoke-WebRequest -Uri "http://localhost:8888/cam1/index.m3u8" -UseBasicParsing | 
    Select-Object StatusCode

# Stream HLS cam2
Invoke-WebRequest -Uri "http://localhost:8888/cam2/index.m3u8" -UseBasicParsing | 
    Select-Object StatusCode
```

**Esperado**: Todos 200 OK

#### **6.3 - Verificar Frontend (Navegador)**

```powershell
# Abrir frontend
Start-Process "http://localhost:8080"
```

**Checklist manual**:
- [ ] Módulo "Rutas" funciona (HU4)
- [ ] Módulo "Turnos de Conductores" funciona (HU4)
- [ ] Módulo "Calendario de Turnos" funciona (HU4)
- [ ] Módulo "Seguridad" funciona (HU4)
- [ ] Módulo "Incidentes" funciona (HU4)
- [ ] Módulo "Cámaras" aparece (HU6)
- [ ] Video cam1 se reproduce (HU6)
- [ ] Video cam2 se reproduce (HU6)

**Criterio de éxito**: ✅ 8/8 módulos funcionales

---

## 🚨 ROLLBACK PLAN

Si algo falla en FASE 5 o 6:

```powershell
# Cancelar merge
git merge --abort

# Volver a HU4
git checkout IS1-105-Fix-HU4-Visualizar-ruta-asignada
git stash pop

# Bajar servicios
cd infra
docker-compose down -v
docker-compose up -d --build

# Reportar conflicto
Write-Host "❌ MERGE FALLIDO - Revisar logs"
```

---

## ✅ CRITERIOS DE ACEPTACIÓN FINAL

### **Técnicos**:
- [ ] Sin conflictos git pendientes
- [ ] 6 servicios corriendo (postgres, gateway, ms-logistica, ms-rrhh, ms-inventario, mediamtx)
- [ ] 12 endpoints de HU4 responden 200 OK
- [ ] 3 endpoints de HU6 responden 200 OK
- [ ] Tabla `vehicle_cameras` tiene datos de ejemplo
- [ ] Streams HLS accesibles en puerto 8888

### **Funcionales**:
- [ ] Usuario puede crear rutas (HU4)
- [ ] Usuario puede ver turnos dinámicos (HU4)
- [ ] Usuario puede registrar incidentes (HU4)
- [ ] Usuario puede ver cámaras en vivo (HU6)
- [ ] Cámaras están asociadas a vehículos (HU6)

### **Calidad**:
- [ ] Sin archivos .backup en repo
- [ ] Sin conflictos en `main.py`
- [ ] Logs sin errores críticos
- [ ] Frontend carga sin errores en consola

---

## 📊 ESTIMACIÓN TOTAL

| Fase | Tiempo | Riesgo |
|------|--------|--------|
| Fase 1 - Preparación | 5 min | 🟢 Bajo |
| Fase 2 - Merge inicial | 10 min | 🟢 Bajo |
| Fase 3 - Resolución conflictos | 20 min | 🟡 Medio |
| Fase 4 - Limpieza | 5 min | 🟢 Bajo |
| Fase 5 - SQL y Testing | 15 min | 🟡 Medio |
| Fase 6 - Verificación | 20 min | 🟢 Bajo |
| **TOTAL** | **75 min** | **🟡 Medio** |

---

## 🎯 PRÓXIMO PASO

**Ejecutar FASE 1**: ¿Procedo con la preparación?

```powershell
# Comando para iniciar:
git stash push -m "HU4 backup antes de merge HU6"
git checkout -b integrate/HU4+HU6
```

**IMPORTANTE**: 
- ⚠️ NO mergear a `main` hasta verificar FASE 6 completa
- ⚠️ Hacer backup de BD antes de FASE 5
- ⚠️ Tener plan de rollback listo

---

**¿Autorización para proceder?** 🚀
