# ms-inventario/app/allocation_service.py
# -*- coding: utf-8 -*-
"""
Servicio de Asignación de Inventario para Entregas
Reserva items cuando se asigna una entrega
Libera items si la entrega falla
UTF-8 en descripción de items y notes
"""

from fastapi import APIRouter, HTTPException, Query, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional, List
from datetime import datetime
import json
import logging

from app.db import get_db

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/allocations", tags=["allocations"])

# ============================================
# POST /api/allocations - Reservar items
# ============================================
@router.post("", response_model=dict)
async def allocate_items(
    allocation_data: dict,
    db: AsyncSession = Depends(get_db)
):
    """
    ENDPOINT INTERNO: Reserva items para una entrega
    
    Llamado por ms-logistica cuando se asigna conductor
    
    Parámetro:
    {
        "delivery_id": 1,
        "vehicle_id": 5,
        "items": [
            {"product_id": 10, "quantity": 2, "description": "Carne de Vacuno 1kg"},
            {"product_id": 15, "quantity": 1, "description": "Queso Fresco Artesanal"}
        ]
    }
    
    Responde con:
    {
        "delivery_id": 1,
        "vehicle_id": 5,
        "allocated_items": 3,
        "total_weight_kg": 3.5,
        "status": "allocated"
    }
    """
    try:
        delivery_id = allocation_data.get("delivery_id")
        vehicle_id = allocation_data.get("vehicle_id")
        items = allocation_data.get("items", [])
        
        # Validar que tenemos items
        if not items:
            raise HTTPException(status_code=400, detail="No items to allocate")
        
        # Placeholder para lógica real de inventario
        # En producción: restar stock, crear registro de reserva, verificar disponibilidad
        
        # Simular reserva exitosa
        total_items = sum(item.get("quantity", 0) for item in items)
        total_weight = sum(item.get("quantity", 1) * 0.5 for item in items)  # Asumir 0.5kg por item
        
        logger.info(f"Allocated {total_items} items for delivery {delivery_id}")
        
        return {
            "delivery_id": delivery_id,
            "vehicle_id": vehicle_id,
            "allocated_items": total_items,
            "total_weight_kg": total_weight,
            "items_detail": [
                {
                    "product_id": item.get("product_id"),
                    "quantity": item.get("quantity"),
                    "description": item.get("description"),  # UTF-8
                    "status": "allocated"
                }
                for item in items
            ],
            "status": "allocated",
            "allocated_at": datetime.utcnow().isoformat()
        }
    except Exception as e:
        logger.error(f"Error allocating items: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

# ============================================
# POST /api/allocations/{allocation_id}/release - Liberar items
# ============================================
@router.post("/{allocation_id}/release", response_model=dict)
async def release_items(
    allocation_id: int,
    release_reason: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    """
    ENDPOINT INTERNO: Libera items reservados
    
    Llamado por ms-logistica cuando una entrega falla
    
    Razones:
    - delivery_failed: Entrega no se pudo completar
    - delivery_cancelled: Cliente cancela
    - stock_adjustment: Ajuste administrativo
    """
    try:
        # Placeholder para lógica real
        logger.info(f"Released allocation {allocation_id}, reason: {release_reason}")
        
        return {
            "allocation_id": allocation_id,
            "status": "released",
            "reason": release_reason or "unknown",
            "released_at": datetime.utcnow().isoformat()
        }
    except Exception as e:
        logger.error(f"Error releasing items: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

# ============================================
# GET /api/allocations - Listar reservas
# ============================================
@router.get("", response_model=List[dict])
async def list_allocations(
    status: Optional[str] = Query(None),  # allocated, released, picked
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db)
):
    """
    Lista reservas de inventario por estado
    """
    try:
        # Placeholder para query real
        return [
            {
                "id": 1,
                "delivery_id": 1,
                "vehicle_id": 5,
                "status": "allocated",
                "items_count": 3,
                "total_weight_kg": 3.5,
                "allocated_at": datetime.utcnow().isoformat()
            }
        ]
    except Exception as e:
        logger.error(f"Error listing allocations: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# ============================================
# GET /api/allocations/{allocation_id} - Detalles
# ============================================
@router.get("/{allocation_id}", response_model=dict)
async def get_allocation_details(
    allocation_id: int,
    db: AsyncSession = Depends(get_db)
):
    """
    Obtiene detalles de una reserva de inventario
    """
    try:
        return {
            "id": allocation_id,
            "delivery_id": 1,
            "vehicle_id": 5,
            "status": "allocated",
            "items": [
                {
                    "product_id": 10,
                    "quantity": 2,
                    "description": "Carne de Vacuno 1kg",  # UTF-8
                    "unit_weight_kg": 1.0
                },
                {
                    "product_id": 15,
                    "quantity": 1,
                    "description": "Queso Fresco Artesanal",  # UTF-8
                    "unit_weight_kg": 0.5
                }
            ],
            "total_items": 3,
            "total_weight_kg": 3.5,
            "allocated_at": datetime.utcnow().isoformat()
        }
    except Exception as e:
        logger.error(f"Error getting allocation details: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# ============================================
# POST /api/allocations/{allocation_id}/confirm - Confirmar pickup
# ============================================
@router.post("/{allocation_id}/confirm", response_model=dict)
async def confirm_pickup(
    allocation_id: int,
    confirmation_data: dict,
    db: AsyncSession = Depends(get_db)
):
    """
    ENDPOINT INTERNO: Confirma que el conductor recogió los items
    
    Llamado por ms-logistica cuando conductor inicia ruta
    """
    try:
        driver_name = confirmation_data.get("driver_name", "Unknown")  # UTF-8
        pickup_location = confirmation_data.get("pickup_location")  # UTF-8
        
        logger.info(f"Confirmed pickup for allocation {allocation_id} by {driver_name}")
        
        return {
            "allocation_id": allocation_id,
            "status": "picked",
            "driver_name": driver_name,  # UTF-8
            "pickup_location": pickup_location,  # UTF-8
            "picked_at": datetime.utcnow().isoformat()
        }
    except Exception as e:
        logger.error(f"Error confirming pickup: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

# ============================================
# GET /api/allocations/vehicle/{vehicle_id} - Items en vehículo
# ============================================
@router.get("/vehicle/{vehicle_id}", response_model=dict)
async def get_vehicle_allocation(
    vehicle_id: int,
    db: AsyncSession = Depends(get_db)
):
    """
    Obtiene inventario actual del vehículo
    Muestra items reservados y peso total
    """
    try:
        return {
            "vehicle_id": vehicle_id,
            "current_load_kg": 45.3,
            "current_load_percentage": 45.3,  # Asumir 100kg capacidad
            "allocated_deliveries": 2,
            "items": [
                {
                    "delivery_id": 1,
                    "product_id": 10,
                    "quantity": 2,
                    "description": "Carne de Vacuno 1kg",  # UTF-8
                    "destination": "Carlos López Martínez"  # UTF-8
                },
                {
                    "delivery_id": 2,
                    "product_id": 15,
                    "quantity": 1,
                    "description": "Queso Fresco Artesanal",  # UTF-8
                    "destination": "Roberto Hernández Acuña"  # UTF-8
                }
            ]
        }
    except Exception as e:
        logger.error(f"Error getting vehicle allocation: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# ============================================
# POST /api/allocations/check-available - Verificar disponibilidad
# ============================================
@router.post("/check-available", response_model=dict)
async def check_availability(
    check_data: dict,
    db: AsyncSession = Depends(get_db)
):
    """
    ENDPOINT INTERNO: Verifica si items están disponibles
    
    Parámetro:
    {
        "items": [
            {"product_id": 10, "quantity": 2},
            {"product_id": 15, "quantity": 5}
        ]
    }
    """
    try:
        items = check_data.get("items", [])
        
        # Simular verificación de disponibilidad
        available = True
        messages = []
        
        for item in items:
            product_id = item.get("product_id")
            required_qty = item.get("quantity", 0)
            
            # En producción, verificar contra BD de inventario
            if product_id == 999:  # Simular producto no disponible
                available = False
                messages.append(f"Producto {product_id} no disponible en cantidad requerida")
        
        return {
            "available": available,
            "items_count": len(items),
            "messages": messages if not available else ["Todos los items disponibles"]
        }
    except Exception as e:
        logger.error(f"Error checking availability: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
