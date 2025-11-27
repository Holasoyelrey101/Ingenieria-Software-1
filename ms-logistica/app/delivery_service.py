# ms-logistica/app/delivery_service.py
# -*- coding: utf-8 -*-
"""
Servicio de entregas - Lógica de negocio para trazabilidad
MINIMAL IMPLEMENTATION - Retorna datos de prueba
UTF-8 en todos los campos
"""

from fastapi import APIRouter, HTTPException, Query, Depends
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime, timedelta
import logging

from app.db import SessionLocal
from app.models import DeliveryRequest

logger = logging.getLogger(__name__)

def get_db():
    """Dependency injection para BD"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

router = APIRouter(prefix="/api/deliveries", tags=["deliveries"])

# ============================================
# GET /api/deliveries - Lista de entregas
# ============================================
@router.get("")
def list_deliveries(
    status: Optional[str] = Query(None),
    date: Optional[str] = Query(None),
    driver_id: Optional[int] = Query(None),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    """Lista entregas con filtros opcionales - DATOS DE PRUEBA"""
    try:
        query = db.query(DeliveryRequest)
        if status:
            query = query.filter(DeliveryRequest.status == status)
        deliveries = query.limit(limit).offset(offset).all()
        
        if deliveries:
            return [
                {
                    "id": d.id,
                    "tracking_number": f"DLV-{d.id:05d}",
                    "status": d.status,
                    "created_at": d.created_at.isoformat() if d.created_at else None,
                }
                for d in deliveries
            ]
    except Exception as e:
        logger.error(f"Error: {e}")
    
    # Datos de prueba
    return [
        {
            "id": 1,
            "tracking_number": "DLV-00001",
            "status": "en_progreso",
            "customer_name": "Carlos López Martínez",
            "driver_name": "María García Rodríguez",
            "created_at": (datetime.now() - timedelta(hours=2)).isoformat(),
        }
    ]

# ============================================
# GET /api/deliveries/{id} - Detalles
# ============================================
@router.get("/{delivery_id}")
def get_delivery_details(
    delivery_id: int,
    db: Session = Depends(get_db)
):
    """Detalles de entrega - DATOS DE PRUEBA"""
    try:
        delivery = db.query(DeliveryRequest).filter(DeliveryRequest.id == delivery_id).first()
        if delivery:
            return {
                "id": delivery.id,
                "tracking_number": f"DLV-{delivery.id:05d}",
                "status": delivery.status,
                "created_at": delivery.created_at.isoformat() if delivery.created_at else None,
            }
    except:
        pass
    
    if delivery_id == 1:
        return {
            "id": 1,
            "tracking_number": "DLV-00001",
            "status": "en_progreso",
            "customer_name": "Carlos López Martínez",
            "driver_name": "María García Rodríguez",
        }
    raise HTTPException(status_code=404, detail="No encontrada")

# ============================================
# GET /api/deliveries/{id}/tracking
# ============================================
@router.get("/{delivery_id}/tracking")
def get_delivery_tracking(delivery_id: int):
    """Tracking - DATOS DE PRUEBA"""
    return {
        "delivery_id": delivery_id,
        "status": "en_progreso",
        "location": {"lat": -33.4420, "lng": -70.6700},
        "eta_minutes": 15,
        "progress": 60
    }

# ============================================
# GET /api/deliveries/{id}/events
# ============================================
@router.get("/{delivery_id}/events")
def get_delivery_events(
    delivery_id: int,
    limit: int = Query(50, ge=1, le=500)
):
    """Eventos - DATOS DE PRUEBA"""
    return [
        {
            "id": 1,
            "delivery_id": delivery_id,
            "type": "created",
            "timestamp": (datetime.now() - timedelta(hours=2)).isoformat(),
            "description": "Entrega creada"
        },
        {
            "id": 2,
            "delivery_id": delivery_id,
            "type": "assigned",
            "timestamp": (datetime.now() - timedelta(minutes=30)).isoformat(),
            "description": "Conductor asignado: María García"
        }
    ]

# ============================================
# GET /api/deliveries/{id}/audit
# ============================================
@router.get("/{delivery_id}/audit")
def get_delivery_audit(delivery_id: int):
    """Auditoría - DATOS DE PRUEBA"""
    return {
        "delivery_id": delivery_id,
        "entries": [
            {
                "timestamp": (datetime.now() - timedelta(hours=2)).isoformat(),
                "changed_by": "Sistema",
                "description": "Entrega creada"
            }
        ]
    }

# ============================================
# GET /api/deliveries/{id}/alerts
# ============================================
@router.get("/{delivery_id}/alerts")
def get_delivery_alerts(delivery_id: int):
    """Alertas - DATOS DE PRUEBA"""
    return {
        "delivery_id": delivery_id,
        "alerts": [
            {
                "id": 1,
                "type": "assigned",
                "message": "Conductor asignado",
                "level": "info"
            }
        ]
    }

# ============================================
# GET /stats/daily
# ============================================
@router.get("/stats/daily")
def get_daily_stats(date: Optional[str] = Query(None)):
    """Estadísticas - DATOS DE PRUEBA"""
    return {
        "date": date or datetime.now().strftime("%Y-%m-%d"),
        "total": 25,
        "completed": 22,
        "failed": 1,
        "in_progress": 2
    }
