# gateway/app/delivery_routes.py
# -*- coding: utf-8 -*-
"""
Endpoints para trazabilidad de entregas
Maneja: listado, detalles, tracking, eventos, auditoría
UTF-8 completo en respuestas
"""

from fastapi import APIRouter, Query, HTTPException
from typing import Optional, List
import httpx
import json
from datetime import datetime

router = APIRouter(prefix="/deliveries", tags=["deliveries"])

# URLs de microservicios
MS_LOGISTICA_URL = "http://ms-logistica:8000"
MS_RRHH_URL = "http://ms-rrhh:8000"

# ============================================
# GET /deliveries - Lista de entregas
# ============================================
@router.get("")
async def list_deliveries(
    status: Optional[str] = Query(None, description="Filtrar por estado"),
    date: Optional[str] = Query(None, description="Filtrar por fecha (YYYY-MM-DD)"),
    driver_id: Optional[int] = Query(None, description="Filtrar por conductor"),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
):
    """
    Lista todas las entregas con filtros opcionales
    
    Parámetros:
    - status: pendiente, asignado, en_progreso, retrasado, completado, fallido, cancelado
    - date: YYYY-MM-DD
    - driver_id: ID del conductor
    - limit: Máximo de registros (default: 20, max: 100)
    - offset: Offset para paginación (default: 0)
    
    Retorna: Lista de entregas con información resumida
    """
    try:
        async with httpx.AsyncClient() as client:
            params = {
                "status": status,
                "date": date,
                "driver_id": driver_id,
                "limit": limit,
                "offset": offset
            }
            # Remover None values
            params = {k: v for k, v in params.items() if v is not None}
            
            response = await client.get(
                f"{MS_LOGISTICA_URL}/api/deliveries",
                params=params,
                timeout=10.0
            )
            response.raise_for_status()
            return response.json()
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Error fetching deliveries: {str(e)}")

# ============================================
# GET /deliveries/{id} - Detalles de entrega
# ============================================
@router.get("/{delivery_id}")
async def get_delivery_details(delivery_id: int):
    """
    Obtiene detalles completos de una entrega
    
    Incluye:
    - Información base (origen, destino, items)
    - Conductor asignado (con nombre UTF-8)
    - Vehículo asignado
    - Estado actual
    - Ubicación actual
    """
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{MS_LOGISTICA_URL}/api/deliveries/{delivery_id}",
                timeout=10.0
            )
            response.raise_for_status()
            return response.json()
    except httpx.HTTPStatusError as e:
        if e.response.status_code == 404:
            raise HTTPException(status_code=404, detail="Entrega no encontrada")
        raise HTTPException(status_code=503, detail="Error fetching delivery details")
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Error: {str(e)}")

# ============================================
# GET /deliveries/{id}/tracking - Tracking en tiempo real
# ============================================
@router.get("/{delivery_id}/tracking")
async def get_delivery_tracking(delivery_id: int):
    """
    Obtiene información de tracking en tiempo real
    
    Retorna:
    - Ubicación actual (lat, lng)
    - ETA estimado
    - Progreso de ruta (%)
    - Retrasos detectados
    - Checkpoint actual
    """
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{MS_LOGISTICA_URL}/api/deliveries/{delivery_id}/tracking",
                timeout=10.0
            )
            response.raise_for_status()
            return response.json()
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Error fetching tracking: {str(e)}")

# ============================================
# GET /deliveries/{id}/events - Eventos de entrega
# ============================================
@router.get("/{delivery_id}/events")
async def get_delivery_events(
    delivery_id: int,
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0)
):
    """
    Obtiene historial de eventos de una entrega
    
    Eventos registrados:
    - created: Entrega creada
    - assigned: Conductor asignado
    - pickup: Recogida en origen
    - in_progress: En camino
    - delayed: Retrasado
    - completed: Completado
    - failed: Fallido
    
    Cada evento incluye:
    - Timestamp preciso
    - Actor (quien lo generó)
    - Ubicación si aplica
    - Descripción en UTF-8
    """
    try:
        async with httpx.AsyncClient() as client:
            params = {"limit": limit, "offset": offset}
            response = await client.get(
                f"{MS_LOGISTICA_URL}/api/deliveries/{delivery_id}/events",
                params=params,
                timeout=10.0
            )
            response.raise_for_status()
            return response.json()
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Error fetching events: {str(e)}")

# ============================================
# GET /deliveries/{id}/audit - Auditoría completa
# ============================================
@router.get("/{delivery_id}/audit")
async def get_delivery_audit(delivery_id: int):
    """
    Obtiene auditoría legal completa de cambios
    
    Registra cada cambio:
    - Asignación de conductor
    - Cambios de estado
    - Pruebas de entrega
    - Cancelaciones
    
    Con:
    - Quién hizo el cambio (nombre UTF-8)
    - Cuándo (timestamp)
    - Valores antiguos y nuevos
    """
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{MS_LOGISTICA_URL}/api/deliveries/{delivery_id}/audit",
                timeout=10.0
            )
            response.raise_for_status()
            return response.json()
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Error fetching audit: {str(e)}")

# ============================================
# GET /deliveries/{id}/alerts - Alertas de entrega
# ============================================
@router.get("/{delivery_id}/alerts")
async def get_delivery_alerts(delivery_id: int):
    """
    Obtiene alertas generadas para esta entrega
    
    Tipos:
    - info: Información
    - warning: Advertencia
    - critical: Crítica
    
    Incluye: quién fue notificado, cuándo se envió, si fue leída
    """
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{MS_LOGISTICA_URL}/api/deliveries/{delivery_id}/alerts",
                timeout=10.0
            )
            response.raise_for_status()
            return response.json()
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Error fetching alerts: {str(e)}")

# ============================================
# POST /deliveries - Crear nueva entrega
# ============================================
@router.post("")
async def create_delivery(delivery_data: dict):
    """
    Crea una nueva entrega
    
    Requerido:
    - tracking_number: Identificador único (ej: DLV-20251108-001)
    - origin: {address, city, lat, lng}
    - destination: {address, city, lat, lng}
    - items: [{id, name, quantity, weight}]
    - customer_name: Nombre del cliente (UTF-8)
    - scheduled_date: YYYY-MM-DD
    - scheduled_time: HH:MM:SS
    
    Genera automáticamente:
    - Event: delivery_created
    - Alert a RRHH managers
    - Reserva en inventario
    """
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{MS_LOGISTICA_URL}/api/deliveries",
                json=delivery_data,
                timeout=10.0
            )
            response.raise_for_status()
            return response.json()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error creating delivery: {str(e)}")

# ============================================
# PUT /deliveries/{id}/assign - Asignar conductor
# ============================================
@router.put("/{delivery_id}/assign")
async def assign_delivery(delivery_id: int, assignment_data: dict):
    """
    Asigna conductor y vehículo a una entrega
    
    Requerido:
    - driver_id: ID del conductor
    - vehicle_id: ID del vehículo
    
    Genera automáticamente:
    - Event: delivery_assigned
    - Alert a RRHH: "Conductor: María García asignado"
    - Alert a Inventario: "Reservar items"
    - Calcula ruta y ETA
    """
    try:
        async with httpx.AsyncClient() as client:
            response = await client.put(
                f"{MS_LOGISTICA_URL}/api/deliveries/{delivery_id}/assign",
                json=assignment_data,
                timeout=10.0
            )
            response.raise_for_status()
            return response.json()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error assigning delivery: {str(e)}")

# ============================================
# PUT /deliveries/{id}/status - Cambiar estado
# ============================================
@router.put("/{delivery_id}/status")
async def update_delivery_status(delivery_id: int, status_update: dict):
    """
    Actualiza el estado de una entrega
    
    Requerido:
    - status: Nuevo estado
    
    Opcional:
    - proof_of_delivery: {photo_url, signature_url, recipient_name}
    - notes: Notas adicionales (UTF-8)
    
    Genera automáticamente:
    - Event correspondiente
    - Alerts a RRHH y otros actores
    - Auditoría del cambio
    """
    try:
        async with httpx.AsyncClient() as client:
            response = await client.put(
                f"{MS_LOGISTICA_URL}/api/deliveries/{delivery_id}/status",
                json=status_update,
                timeout=10.0
            )
            response.raise_for_status()
            return response.json()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error updating status: {str(e)}")

# ============================================
# GET /deliveries/search - Búsqueda avanzada
# ============================================
@router.get("/search/advanced")
async def search_deliveries(
    tracking_number: Optional[str] = Query(None),
    customer_name: Optional[str] = Query(None),
    driver_name: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    limit: int = Query(20, ge=1, le=100),
):
    """
    Búsqueda avanzada de entregas con múltiples filtros
    
    Soporta UTF-8 en búsquedas:
    - customer_name: Ej. "María García"
    - driver_name: Ej. "Carlos López"
    
    Retorna entregas que coincidan con los filtros
    """
    try:
        async with httpx.AsyncClient() as client:
            params = {
                "tracking_number": tracking_number,
                "customer_name": customer_name,
                "driver_name": driver_name,
                "status": status,
                "date_from": date_from,
                "date_to": date_to,
                "limit": limit
            }
            params = {k: v for k, v in params.items() if v is not None}
            
            response = await client.get(
                f"{MS_LOGISTICA_URL}/api/deliveries/search",
                params=params,
                timeout=10.0
            )
            response.raise_for_status()
            return response.json()
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Error searching: {str(e)}")

# ============================================
# GET /deliveries/stats/daily - Estadísticas diarias
# ============================================
@router.get("/stats/daily")
async def get_daily_stats(date: Optional[str] = Query(None, description="YYYY-MM-DD")):
    """
    Obtiene estadísticas diarias de entregas
    
    Retorna:
    - Entregas completadas
    - Entregas fallidas
    - Tiempo promedio de entrega
    - Retrasos detectados
    - Performance por conductor
    """
    try:
        async with httpx.AsyncClient() as client:
            params = {"date": date} if date else {}
            response = await client.get(
                f"{MS_LOGISTICA_URL}/api/stats/daily",
                params=params,
                timeout=10.0
            )
            response.raise_for_status()
            return response.json()
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Error fetching stats: {str(e)}")
