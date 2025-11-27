# HU4: Instrucciones para Configurar Google Maps API Key

## ⚠️ Estado Actual

El sistema **ya está configurado** para usar variables de entorno para la API key de Google Maps. Solo necesitas agregar la key real cuando la tengas disponible.

## ✅ Lo que ya está implementado

1. ✅ `MapView.tsx` lee la API key desde `import.meta.env.VITE_GOOGLE_MAPS_API_KEY`
2. ✅ `.env.example` tiene el placeholder configurado
3. ✅ `.gitignore` ya excluye archivos `.env` para evitar commits accidentales
4. ✅ No hay API keys hardcodeadas en el código

## 📝 Pasos para configurar (cuando tengas la API key)

### 1. Obtener API Key de Google Maps

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Crea un proyecto o selecciona uno existente
3. Habilita las siguientes APIs:
   - Maps JavaScript API
   - Places API
   - Directions API
4. Ve a **Credenciales** → **Crear credenciales** → **Clave de API**
5. Copia la API key generada

### 2. Crear archivo `.env` en el directorio `web/`

```bash
# Desde la raíz del proyecto
cd web
cp .env.example .env
```

### 3. Editar el archivo `.env`

Abre `web/.env` y reemplaza `YOUR_API_KEY_HERE` con tu API key real:

```env
VITE_GOOGLE_MAPS_API_KEY=AIzaSyA...tu_key_real_aqui
VITE_API_URL=http://localhost:8000
VITE_API_INVENTARIO=http://localhost:8002
VITE_API_LOGISTICA=http://localhost:8001
VITE_API_RRHH=http://localhost:8003
```

### 4. Reiniciar el servidor de desarrollo

```bash
# Detener el servidor actual (Ctrl+C)
# Reiniciar
npm run dev
```

### 5. Verificar que funciona

1. Abre `http://localhost:5173`
2. El mapa de Google Maps debe cargar correctamente
3. Inspecciona el código fuente (F12) → No debe aparecer la API key

## 🔒 Seguridad

- ✅ El archivo `.env` **NO** se commitea a Git (está en `.gitignore`)
- ✅ La API key solo existe en tu máquina local
- ✅ En producción, usa variables de entorno del servidor

## ⚠️ Restricciones Recomendadas

Para proteger tu API key en producción:

1. **Restricciones de HTTP referrer**:
   - Agrega tu dominio: `https://tu-dominio.com/*`
   - Para desarrollo local: `http://localhost:5173/*`

2. **Restricciones de API**:
   - Limita a solo las APIs que necesitas:
     - Maps JavaScript API
     - Places API
     - Directions API

3. **Cuotas y límites**:
   - Configura alertas de facturación
   - Establece límites diarios de uso

## 🛠️ Script de Validación (Opcional)

Cuando tengas la API key configurada, puedes crear este script para validar la seguridad:

**`scripts/check_api_key_security.sh`**:

```bash
#!/bin/bash

echo "🔍 Validando seguridad de API key..."

# Verificar que no hay API keys en el código
if grep -r "AIza" web/src --include="*.tsx" --include="*.jsx" --include="*.html" --include="*.js" 2>/dev/null; then
    echo "❌ ERROR: Se encontró API key hardcodeada en el código"
    exit 1
else
    echo "✅ No se encontraron API keys hardcodeadas"
fi

# Verificar que .env está en .gitignore
if grep -q "web/.env" .gitignore 2>/dev/null; then
    echo "✅ web/.env está en .gitignore"
else
    echo "⚠️  ADVERTENCIA: web/.env NO está en .gitignore"
fi

# Verificar que .env.example existe
if [ -f "web/.env.example" ]; then
    echo "✅ web/.env.example existe"
else
    echo "❌ ERROR: web/.env.example no existe"
    exit 1
fi

# Verificar que MapView.tsx usa variable de entorno
if grep -q "import.meta.env.VITE_GOOGLE_MAPS_API_KEY" web/src/MapView.tsx 2>/dev/null; then
    echo "✅ MapView.tsx usa variable de entorno"
else
    echo "❌ ERROR: MapView.tsx no usa variable de entorno"
    exit 1
fi

echo ""
echo "✅ Todas las validaciones pasaron correctamente"
```

Ejecutar:

```bash
bash scripts/check_api_key_security.sh
```

## 📚 Referencias

- [Google Maps Platform - Get API Key](https://developers.google.com/maps/documentation/javascript/get-api-key)
- [Best Practices for API Keys](https://developers.google.com/maps/api-security-best-practices)
- [Vite Environment Variables](https://vitejs.dev/guide/env-and-mode.html)
