# HU6 - Verificación de Cámaras (robusto en rutas)
$ErrorActionPreference = "Continue"

# Localiza docker-compose.yaml sin depender del cwd
function Resolve-Compose {
  param()
  $candidates = @(
    (Join-Path $PSScriptRoot '..\infra\docker-compose.yaml'),
    (Join-Path (Get-Location).Path 'infra\docker-compose.yaml')
  )
  foreach ($c in $candidates) {
    if (Test-Path $c) { return (Resolve-Path $c).Path }
  }
  throw "No se encontró infra\docker-compose.yaml"
}
$compose = Resolve-Compose

function Compose { param([Parameter(ValueFromRemainingArguments=$true)][string[]]$Args) docker compose -f $compose @Args }

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "  HU6 - Verificación de Cámaras" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# 1) Reiniciar publishers
Write-Host "1) Reiniciando publishers..." -ForegroundColor Yellow
Compose restart test-pub test-pub2 | Out-Null
Start-Sleep -Seconds 4

# 2) MediaMTX arriba
Write-Host "2) Verificando MediaMTX..." -ForegroundColor Yellow
$ps = Compose ps mediamtx | Out-String
if ($ps -match "Up") { Write-Host "✅ MediaMTX corriendo" -ForegroundColor Green } else { Write-Host "❌ MediaMTX no está corriendo" -ForegroundColor Red; exit 1 }

# 3) HLS con reintentos
Write-Host "3) Verificando HLS..." -ForegroundColor Yellow
$cams = @("cam1","cam2")
$okAll = $true
foreach ($c in $cams) {
  $url = "http://localhost:8888/$c/index.m3u8"
  $ok = $false
  1..6 | ForEach-Object {
    $head = (curl.exe -s -I $url) 2>$null
    if ($head -match "200 OK") { Write-Host "✅ $c OK"; $ok = $true; break }
    else { Write-Host "⏳ $c reintento $_/6"; Start-Sleep -Seconds 2 }
  }
  if (-not $ok) { Write-Host "❌ $c 404/timeout"; $okAll = $false }
}

# 4) Backend básico
Write-Host "4) Verificando backend..." -ForegroundColor Yellow
try {
  $list = (Invoke-WebRequest http://localhost:8000/camaras/list -UseBasicParsing).Content | ConvertFrom-Json
  Write-Host "✅ /camaras/list → $($list.camaras -join ', ')"
  $one = (Invoke-WebRequest http://localhost:8000/camaras/hls/cam1 -UseBasicParsing).Content | ConvertFrom-Json
  $key = ($one.PSObject.Properties.Name | Select-Object -First 1)  # m3u8 o url
  Write-Host "✅ /camaras/hls/cam1 → $($one.$key)"
} catch { Write-Host "❌ Backend no responde"; $okAll = $false }

# 5) Frontend arriba
Write-Host "5) Verificando frontend..." -ForegroundColor Yellow
$fh = (curl.exe -s -I http://localhost:8080) 2>$null
if ($fh -match "200 OK") { Write-Host "✅ Frontend OK" -ForegroundColor Green } else { Write-Host "⚠️ Frontend respuesta no 200" }

Write-Host ""
if ($okAll) {
  Write-Host "✅ Verificación OK. Abriendo /seguridad/camaras..." -ForegroundColor Green
  Start-Process "http://localhost:8080/seguridad/camaras"
  exit 0
} else {
  Write-Host "⚠️ Verificación con fallos. Revisa logs:" -ForegroundColor Yellow
  Write-Host "  docker compose -f `"$compose`" logs --tail=50 test-pub"
  Write-Host "  docker compose -f `"$compose`" logs --tail=50 test-pub2"
  Write-Host "  docker compose -f `"$compose`" logs --tail=50 mediamtx"
  exit 2
}
