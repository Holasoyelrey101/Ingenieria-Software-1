# MS-Logistica - Sistema de Rutas Optimizadas

## 🚀 Funcionalidades

### Mapas y Geocodificación
- POST /maps/geocode - Geocodificación de direcciones
- POST /maps/directions - Cálculo de direcciones
- Config via env var GOOGLE_MAPS_SERVER_KEY

### HU3: Rutas Optimizadas ✅
Sistema para generar rutas optimizadas considerando eficiencia y reducción de retrasos.

**Endpoints implementados:**
- `POST /routes/optimize` - Optimiza secuencia de paradas
- `GET /routes/{id}` - Recupera ruta guardada

### HU4: Visualizar Ruta Asignada ✅ (Backend)
API para que conductores consulten sus rutas asignadas.

## 📋 Endpoints de Rutas

### POST /routes/optimize
Optimiza la secuencia de paradas para un conjunto de pedidos.

**Request Body:**
```json
{
  "orders": [
    {"id": 10, "lat": -33.44, "lon": -70.65},
    {"id": 20, "lat": -33.45, "lon": -70.66},
    {"id": 30, "lat": -33.43, "lon": -70.64}
  ]
}
```

**Response:**
```json
{
  "route_id": 1,
  "stops": [
    {"order_id": 10, "sequence": 1},
    {"order_id": 20, "sequence": 2},
    {"order_id": 30, "sequence": 3}
  ]
}
```

### GET /routes/{id}
Obtiene los detalles de una ruta guardada.

**Response:**
```json
{
  "route_id": 1,
  "stops": [
    {"order_id": 10, "sequence": 1, "lat": -33.44, "lon": -70.65},
    {"order_id": 20, "sequence": 2, "lat": -33.45, "lon": -70.66},
    {"order_id": 30, "sequence": 3, "lat": -33.43, "lon": -70.64}
  ]
}
```

## 🚀 Cómo usar

### Desarrollo local
```bash
cd ms-logistica
python -m uvicorn app.main:app --reload --port 8001
```

### Swagger UI
http://localhost:8001/docs

### Health Check
http://localhost:8001/health

## 🎯 Estado de Historias de Usuario

- ✅ **HU3: Rutas optimizadas** - COMPLETADA
- ✅ **HU4: Visualizar ruta asignada** - BACKEND COMPLETADO
