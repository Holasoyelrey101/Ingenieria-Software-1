# HU6 - Verificación de Cámaras
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "  HU6 - Verificación de Cámaras" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

$ErrorActionPreference = "Continue"

# 1. Reiniciar publishers
Write-Host "1. Reiniciando publishers..." -ForegroundColor Yellow
docker compose -f ..\infra\docker-compose.yaml restart test-pub test-pub2
Start-Sleep -Seconds 5

# 2. Verificar MediaMTX
Write-Host "2. Verificando MediaMTX..." -ForegroundColor Yellow
$mtxStatus = docker compose -f ..\infra\docker-compose.yaml ps mediamtx
if ($mtxStatus -match "Up") {
    Write-Host "✅ MediaMTX corriendo" -ForegroundColor Green
} else {
    Write-Host "❌ MediaMTX no está corriendo" -ForegroundColor Red
    exit 1
}

# 3. Verificar HLS con reintentos
Write-Host "3. Verificando streams HLS (con reintentos)..." -ForegroundColor Yellow

$camaras = @("cam1", "cam2")
$maxReintentos = 5
$exitoso = $true

foreach ($cam in $camaras) {
    $url = "http://localhost:8888/$cam/index.m3u8"
    $intento = 0
    $ok = $false
    
    while ($intento -lt $maxReintentos -and -not $ok) {
        $intento++
        try {
            $response = Invoke-WebRequest -Uri $url -Method Head -ErrorAction Stop
            if ($response.StatusCode -eq 200) {
                Write-Host "✅ $cam : OK" -ForegroundColor Green
                $ok = $true
            }
        } catch {
            Write-Host "⏳ $cam : Reintento $intento/$maxReintentos..." -ForegroundColor Yellow
            Start-Sleep -Seconds 2
        }
    }
    
    if (-not $ok) {
        Write-Host "❌ $cam : FALLO después de $maxReintentos reintentos" -ForegroundColor Red
        $exitoso = $false
    }
}

# 4. Verificar Backend
Write-Host "4. Verificando Backend..." -ForegroundColor Yellow
try {
    $listResponse = Invoke-WebRequest -Uri "http://localhost:8000/camaras/list" -ErrorAction Stop
    $listData = $listResponse.Content | ConvertFrom-Json
    Write-Host "✅ Backend: Lista de cámaras OK ($($listData.camaras.Count) cámaras)" -ForegroundColor Green
    
    # Verificar health de cada cámara
    foreach ($cam in $listData.camaras) {
        try {
            $healthResponse = Invoke-WebRequest -Uri "http://localhost:8000/camaras/health/$cam" -ErrorAction Stop
            $healthData = $healthResponse.Content | ConvertFrom-Json
            $status = if ($healthData.online) { "✅ Online" } else { "⚠️ Offline" }
            Write-Host "  $cam : $status" -ForegroundColor $(if ($healthData.online) { "Green" } else { "Yellow" })
        } catch {
            Write-Host "  $cam : ❌ Error" -ForegroundColor Red
        }
    }
} catch {
    Write-Host "❌ Backend: Error al obtener lista" -ForegroundColor Red
    $exitoso = $false
}

# 5. Verificar Frontend
Write-Host "5. Verificando Frontend..." -ForegroundColor Yellow
try {
    $webResponse = Invoke-WebRequest -Uri "http://localhost:8080" -Method Head -ErrorAction Stop
    if ($webResponse.StatusCode -eq 200) {
        Write-Host "✅ Frontend: OK" -ForegroundColor Green
    }
} catch {
    Write-Host "❌ Frontend: No responde" -ForegroundColor Red
    $exitoso = $false
}

Write-Host ""
Write-Host "=====================================" -ForegroundColor Cyan

if ($exitoso) {
    Write-Host "✅ Todas las verificaciones pasaron" -ForegroundColor Green
    Write-Host ""
    Write-Host "Abriendo página de cámaras..." -ForegroundColor Cyan
    Start-Sleep -Seconds 2
    Start-Process "http://localhost:8080/seguridad/camaras"
} else {
    Write-Host "❌ Algunas verificaciones fallaron" -ForegroundColor Red
    Write-Host ""
    Write-Host "Revisa los logs:" -ForegroundColor Yellow
    Write-Host "  docker compose -f ..\infra\docker-compose.yaml logs test-pub" -ForegroundColor Gray
    Write-Host "  docker compose -f ..\infra\docker-compose.yaml logs test-pub2" -ForegroundColor Gray
    Write-Host "  docker compose -f ..\infra\docker-compose.yaml logs mediamtx" -ForegroundColor Gray
}
