# ms-rrhh/app/alert_service.py
# -*- coding: utf-8 -*-
"""
Servicio de Alertas de Entregas - Notificaciones a Conductores y Managers
Escucha eventos de entregas y envía alertas en tiempo real
UTF-8 en todos los mensajes y campos de conductor
"""

from fastapi import APIRouter, HTTPException, Query, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional, List
from datetime import datetime
import json
import logging
import httpx

from app.db import get_db
from app.models import DeliveryAlert

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/alerts", tags=["alerts"])

# ============================================
# Tipos de alertas soportadas
# ============================================
ALERT_TYPES = {
    "delivery_created": {
        "level": "info",
        "recipients": ["rrhh_manager"],
        "template": "Nueva entrega #{tracking_number} para {customer_name}"  # UTF-8
    },
    "delivery_assigned": {
        "level": "info",
        "recipients": ["rrhh_manager", "conductor"],
        "template": "Conductor {driver_name} asignado a #{tracking_number}"  # UTF-8
    },
    "delivery_in_progress": {
        "level": "info",
        "recipients": ["rrhh_manager"],
        "template": "En ruta: {driver_name} entregando a {customer_name}"  # UTF-8
    },
    "delivery_delayed": {
        "level": "warning",
        "recipients": ["rrhh_manager", "conductor"],
        "template": "⚠️ RETRASADO: {driver_name} retraso de {delay_minutes} min"  # UTF-8
    },
    "delivery_completed": {
        "level": "success",
        "recipients": ["rrhh_manager"],
        "template": "✓ COMPLETADO: {customer_name} entregado por {driver_name}"  # UTF-8
    },
    "delivery_failed": {
        "level": "error",
        "recipients": ["rrhh_manager"],
        "template": "❌ FALLA: Entrega #{tracking_number} falló - {reason}"  # UTF-8
    }
}

# ============================================
# GET /api/alerts - Listar alertas
# ============================================
@router.get("", response_model=List[dict])
async def list_alerts(
    conductor_id: Optional[int] = Query(None),
    status: Optional[str] = Query(None),  # read, unread, sent, pending
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db)
):
    """
    Lista alertas de entregas
    
    Parámetros:
    - conductor_id: Filtrar por conductor
    - status: read, unread, sent, pending
    
    Responde con UTF-8 en:
    - message: "Conductor: María García asignado"
    """
    try:
        query = select(DeliveryAlert)
        
        # Filtros
        if conductor_id:
            query = query.where(DeliveryAlert.recipient_id == conductor_id)
        
        if status == "read":
            query = query.where(DeliveryAlert.read_at.isnot(None))
        elif status == "unread":
            query = query.where(DeliveryAlert.read_at.is_(None))
        elif status == "sent":
            query = query.where(DeliveryAlert.is_sent == True)
        elif status == "pending":
            query = query.where(DeliveryAlert.is_sent == False)
        
        query = query.order_by(DeliveryAlert.created_at.desc()).limit(limit).offset(offset)
        
        result = await db.execute(query)
        alerts = result.scalars().all()
        
        return [
            {
                "id": a.id,
                "delivery_id": a.delivery_id,
                "alert_type": a.alert_type,
                "alert_level": a.alert_level,
                "message": a.message,  # UTF-8
                "recipient_type": a.recipient_type,
                "recipient_id": a.recipient_id,
                "is_sent": a.is_sent,
                "sent_at": a.sent_at.isoformat() if a.sent_at else None,
                "read_at": a.read_at.isoformat() if a.read_at else None,
                "created_at": a.created_at.isoformat()
            }
            for a in alerts
        ]
    except Exception as e:
        logger.error(f"Error listing alerts: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# ============================================
# GET /api/alerts/conductor/{conductor_id} - Alertas del conductor
# ============================================
@router.get("/conductor/{conductor_id}", response_model=List[dict])
async def get_conductor_alerts(
    conductor_id: int,
    unread_only: bool = Query(False),
    limit: int = Query(50),
    db: AsyncSession = Depends(get_db)
):
    """
    Obtiene alertas para un conductor específico
    Incluye entregas asignadas, retrasos, actualizaciones
    
    Responde con UTF-8:
    - message: "Conductor: María García asignado a #DLV-001"
    """
    try:
        query = select(DeliveryAlert).where(
            DeliveryAlert.recipient_id == conductor_id
        )
        
        if unread_only:
            query = query.where(DeliveryAlert.read_at.is_(None))
        
        query = query.order_by(DeliveryAlert.created_at.desc()).limit(limit)
        
        result = await db.execute(query)
        alerts = result.scalars().all()
        
        return [
            {
                "id": a.id,
                "delivery_id": a.delivery_id,
                "message": a.message,  # UTF-8
                "alert_level": a.alert_level,
                "created_at": a.created_at.isoformat(),
                "is_read": a.read_at is not None
            }
            for a in alerts
        ]
    except Exception as e:
        logger.error(f"Error fetching conductor alerts: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# ============================================
# POST /api/alerts/{alert_id}/read - Marcar como leída
# ============================================
@router.post("/{alert_id}/read", response_model=dict)
async def mark_alert_as_read(
    alert_id: int,
    db: AsyncSession = Depends(get_db)
):
    """
    Marca una alerta como leída
    """
    try:
        result = await db.execute(
            select(DeliveryAlert).where(DeliveryAlert.id == alert_id)
        )
        alert = result.scalar_one_or_none()
        
        if not alert:
            raise HTTPException(status_code=404, detail="Alerta no encontrada")
        
        alert.read_at = datetime.utcnow()
        await db.commit()
        
        return {"id": alert.id, "status": "read", "read_at": alert.read_at.isoformat()}
    except Exception as e:
        await db.rollback()
        logger.error(f"Error marking alert as read: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# ============================================
# POST /api/alerts/send - Enviar alerta (Interno - desde ms-logistica)
# ============================================
@router.post("/send", response_model=dict)
async def send_delivery_alert(
    alert_data: dict,
    db: AsyncSession = Depends(get_db)
):
    """
    ENDPOINT INTERNO: Recibe evento de entrega y envía alertas
    
    Llamado por ms-logistica cuando:
    - Se crea entrega
    - Se asigna conductor
    - Se detecta retraso
    - Se completa entrega
    
    Parámetro:
    {
        "delivery_id": 1,
        "event_type": "delivery_assigned",
        "data": {
            "tracking_number": "DLV-001",
            "customer_name": "Carlos López",
            "driver_name": "María García",
            "delay_minutes": 20
        }
    }
    """
    try:
        delivery_id = alert_data.get("delivery_id")
        event_type = alert_data.get("event_type")
        data = alert_data.get("data", {})
        
        # Validar tipo de evento
        if event_type not in ALERT_TYPES:
            logger.warning(f"Unknown event type: {event_type}")
            return {"message": "Event type not recognized"}
        
        alert_config = ALERT_TYPES[event_type]
        
        # Preparar mensaje con UTF-8
        message = alert_config["template"].format(
            tracking_number=data.get("tracking_number", ""),
            customer_name=data.get("customer_name", ""),  # UTF-8
            driver_name=data.get("driver_name", ""),  # UTF-8
            delay_minutes=data.get("delay_minutes", 0),
            reason=data.get("reason", "")
        )
        
        # Crear alertas para cada recipient type
        alerts_created = []
        for recipient_type in alert_config["recipients"]:
            alert = DeliveryAlert(
                delivery_id=delivery_id,
                alert_type=event_type,
                alert_level=alert_config["level"],
                message=message,  # UTF-8
                recipient_type=recipient_type,
                recipient_id=data.get(f"{recipient_type}_id"),
                is_sent=False
            )
            db.add(alert)
            alerts_created.append(alert)
        
        await db.commit()
        
        # Enviar notificaciones por correo (async en background)
        try:
            await send_email_notifications(message, [
                a.recipient_id for a in alerts_created if a.recipient_id
            ])
        except Exception as e:
            logger.error(f"Error sending email notifications: {str(e)}")
            # No fallamos por correo, la alerta fue creada exitosamente
        
        logger.info(f"Alert created for delivery {delivery_id}: {event_type}")
        
        return {
            "delivery_id": delivery_id,
            "event_type": event_type,
            "message": message,  # UTF-8
            "alerts_created": len(alerts_created)
        }
    except Exception as e:
        await db.rollback()
        logger.error(f"Error sending delivery alert: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

# ============================================
# FUNCIÓN HELPER: Enviar emails
# ============================================
async def send_email_notifications(message: str, recipient_ids: List[int]):
    """
    Envía notificaciones por correo a conductores/managers
    UTF-8 en subject y body
    """
    try:
        # En producción, integrar con servicio de email real
        # Por ahora solo loguear
        logger.info(f"EMAIL NOTIFICATION: {message} to {len(recipient_ids)} recipients")
        
        # Placeholder para integración con Sendgrid, AWS SES, etc.
        # async with httpx.AsyncClient() as client:
        #     await client.post(
        #         "https://api.sendgrid.com/v3/mail/send",
        #         headers={"Authorization": f"Bearer {SENDGRID_API_KEY}"},
        #         json={
        #             "personalizations": [...],
        #             "from": {"email": "alerts@empresa.cl"},
        #             "subject": "Alerta de Entrega",
        #             "content": [{"type": "text/html", "value": message}]
        #         }
        #     )
    except Exception as e:
        logger.error(f"Error in send_email_notifications: {str(e)}")

# ============================================
# GET /api/alerts/stats - Estadísticas de alertas
# ============================================
@router.get("/stats", response_model=dict)
async def get_alert_stats(
    db: AsyncSession = Depends(get_db)
):
    """
    Obtiene estadísticas de alertas (para dashboard)
    """
    try:
        # Total alertas
        total_result = await db.execute(select(DeliveryAlert))
        total = len(total_result.scalars().all())
        
        # Sin leer
        unread_result = await db.execute(
            select(DeliveryAlert).where(DeliveryAlert.read_at.is_(None))
        )
        unread = len(unread_result.scalars().all())
        
        # Por tipo
        by_type_result = await db.execute(select(DeliveryAlert.alert_type))
        by_type = {}
        for (alert_type,) in by_type_result:
            by_type[alert_type] = by_type.get(alert_type, 0) + 1
        
        # Por nivel
        by_level_result = await db.execute(select(DeliveryAlert.alert_level))
        by_level = {}
        for (level,) in by_level_result:
            by_level[level] = by_level.get(level, 0) + 1
        
        return {
            "total_alerts": total,
            "unread": unread,
            "by_type": by_type,
            "by_level": by_level,
            "unread_percentage": round((unread / total * 100) if total > 0 else 0, 2)
        }
    except Exception as e:
        logger.error(f"Error getting alert stats: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
