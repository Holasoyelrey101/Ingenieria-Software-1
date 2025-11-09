# Script de verificación para HU6 - Vehicle Cameras
# Verifica que todos los cambios estén funcionando correctamente

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Verificación de Vehicle Cameras (HU6)" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$API_URL = "http://localhost:8000"
$FRONTEND_URL = "http://localhost:5173"

# 1. Verificar que el script SQL existe
Write-Host "1. Verificando archivo SQL..." -ForegroundColor Yellow
if (Test-Path "infra/sql/006_vehicle_cameras.sql") {
    Write-Host "   ✅ Script SQL encontrado" -ForegroundColor Green
} else {
    Write-Host "   ❌ Script SQL NO encontrado" -ForegroundColor Red
    exit 1
}

# 2. Verificar que el backend esté corriendo
Write-Host "`n2. Verificando backend..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$API_URL/health" -Method GET -TimeoutSec 5
    if ($response.StatusCode -eq 200) {
        Write-Host "   ✅ Backend está corriendo" -ForegroundColor Green
    }
} catch {
    Write-Host "   ❌ Backend NO está corriendo. Inicia el servicio gateway primero." -ForegroundColor Red
    Write-Host "   Ejecuta: docker compose up -d gateway" -ForegroundColor Yellow
    exit 1
}

# 3. Verificar endpoints de cámaras existentes
Write-Host "`n3. Verificando endpoints de cámaras..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$API_URL/camaras/list" -Method GET -TimeoutSec 5
    if ($response.StatusCode -eq 200) {
        $data = $response.Content | ConvertFrom-Json
        Write-Host "   ✅ Endpoint /camaras/list funciona" -ForegroundColor Green
        Write-Host "   📹 Cámaras disponibles: $($data.camaras -join ', ')" -ForegroundColor Cyan
    }
} catch {
    Write-Host "   ❌ Error en /camaras/list" -ForegroundColor Red
}

# 4. Verificar nuevos endpoints de vehículos
Write-Host "`n4. Verificando nuevos endpoints de vehículos..." -ForegroundColor Yellow

# Verificar endpoint de asignaciones
try {
    $response = Invoke-WebRequest -Uri "$API_URL/camaras/assignments" -Method GET -TimeoutSec 5
    if ($response.StatusCode -eq 200) {
        $data = $response.Content | ConvertFrom-Json
        Write-Host "   ✅ Endpoint /camaras/assignments funciona" -ForegroundColor Green
        Write-Host "   📊 Asignaciones encontradas: $($data.assignments.Count)" -ForegroundColor Cyan
    }
} catch {
    Write-Host "   ⚠️  Endpoint /camaras/assignments no responde (puede ser normal si no hay datos)" -ForegroundColor Yellow
}

# 5. Verificar frontend
Write-Host "`n5. Verificando frontend..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$FRONTEND_URL" -Method GET -TimeoutSec 5
    if ($response.StatusCode -eq 200) {
        Write-Host "   ✅ Frontend está corriendo" -ForegroundColor Green
    }
} catch {
    Write-Host "   ⚠️  Frontend NO está corriendo. Inicia el servicio web." -ForegroundColor Yellow
    Write-Host "   Ejecuta: docker compose up -d web" -ForegroundColor Yellow
}

# 6. Verificar base de datos (requiere conexión)
Write-Host "`n6. Verificando base de datos..." -ForegroundColor Yellow
Write-Host "   ℹ️  Para verificar la tabla vehicle_cameras, ejecuta:" -ForegroundColor Cyan
Write-Host "   docker exec -it infra-postgres-1 psql -U lux -d erp -c '\d vehicle_cameras'" -ForegroundColor White
Write-Host "   O conecta a pgAdmin en http://localhost:5050" -ForegroundColor Cyan

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Resumen de verificación" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Para verificar visualmente:" -ForegroundColor Yellow
Write-Host "1. Abre el navegador en: $FRONTEND_URL" -ForegroundColor White
Write-Host "2. Ve a: Seguridad > ⚙️ Gestión de Cámaras" -ForegroundColor White
Write-Host "3. Selecciona un vehículo y prueba asignar/desasignar cámaras" -ForegroundColor White
Write-Host ""
Write-Host "Endpoints disponibles:" -ForegroundColor Yellow
Write-Host "- GET  $API_URL/camaras/vehicles/{id}/cameras" -ForegroundColor White
Write-Host "- POST $API_URL/camaras/vehicles/{id}/cameras" -ForegroundColor White
Write-Host "- DELETE $API_URL/camaras/vehicles/{id}/cameras/{camera_id}" -ForegroundColor White
Write-Host "- GET  $API_URL/camaras/assignments" -ForegroundColor White
Write-Host ""

