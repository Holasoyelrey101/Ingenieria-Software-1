# -*- coding: utf-8 -*-
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from app.db import get_db
from app import models
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timedelta
import uuid
import logging
import json

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/maintenance", tags=["maintenance"])

# Función global para limpiar caracteres especiales
def clean_special_chars(text):
    """Elimina todos los caracteres especiales que causan problemas de codificación"""
    if not text:
        return text
    
    # Mapeo completo de caracteres especiales
    char_map = {
        'á': 'a', 'à': 'a', 'ä': 'a', 'â': 'a', 'ã': 'a', 'å': 'a',
        'é': 'e', 'è': 'e', 'ë': 'e', 'ê': 'e',
        'í': 'i', 'ì': 'i', 'ï': 'i', 'î': 'i',
        'ó': 'o', 'ò': 'o', 'ö': 'o', 'ô': 'o', 'õ': 'o',
        'ú': 'u', 'ù': 'u', 'ü': 'u', 'û': 'u',
        'ñ': 'n', 'ç': 'c',
        'Á': 'A', 'À': 'A', 'Ä': 'A', 'Â': 'A', 'Ã': 'A', 'Å': 'A',
        'É': 'E', 'È': 'E', 'Ë': 'E', 'Ê': 'E',
        'Í': 'I', 'Ì': 'I', 'Ï': 'I', 'Î': 'I',
        'Ó': 'O', 'Ò': 'O', 'Ö': 'O', 'Ô': 'O', 'Õ': 'O',
        'Ú': 'U', 'Ù': 'U', 'Ü': 'U', 'Û': 'U',
        'Ñ': 'N', 'Ç': 'C'
    }
    
    for char, replacement in char_map.items():
        text = text.replace(char, replacement)
    
    return text

# Schemas de Pydantic
class AssetCreate(BaseModel):
    nombre: str
    tipo: str
    modelo: Optional[str] = None
    marca: Optional[str] = None
    numero_serie: Optional[str] = None
    ubicacion: Optional[str] = None
    fecha_adquisicion: Optional[datetime] = None

class AssetResponse(BaseModel):
    id: int
    nombre: str
    tipo: str
    modelo: Optional[str]
    marca: Optional[str]
    numero_serie: Optional[str]
    ubicacion: Optional[str]
    estado: str
    fecha_adquisicion: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True

class MaintenanceTaskCreate(BaseModel):
    title: str
    description: Optional[str] = ""
    asset_id: int
    task_type: Optional[str] = "preventive"
    due_date: Optional[str] = None

class MaintenanceTaskUpdate(BaseModel):
    task_type: Optional[str] = None
    priority: Optional[str] = None
    status: Optional[str] = None
    scheduled_date: Optional[datetime] = None
    due_date: Optional[datetime] = None
    assigned_to: Optional[str] = None
    description: Optional[str] = None
    estimated_duration: Optional[int] = None

class MaintenanceTaskResponse(BaseModel):
    id: str
    asset_id: int
    asset_name: str
    task_type: str
    priority: str
    status: str
    scheduled_date: Optional[datetime]
    due_date: Optional[datetime]
    assigned_to: Optional[str]
    description: str
    estimated_duration: Optional[int]
    created_at: datetime
    updated_at: Optional[datetime]
    completed_at: Optional[datetime]

    class Config:
        from_attributes = True

# NOTA: Los datos de assets ahora vienen directamente de la base de datos
# Los vehículos de transporte de lujo blindado están definidos en 008_luxury_transport_vehicles.sql

# Función para inicializar datos base
def initialize_base_data(db: Session):
    """Inicializar datos base necesarios para el sistema de mantenimiento"""
    try:
        # Crear categorías de activos si no existen
        if db.query(models.AssetCategory).count() == 0:
            categories = [
                {"name": "Vehículos de Carga Premium", "description": "Camiones especializados en transporte de lujo", "color_code": "#EF4444"},
                {"name": "Vehículos Ejecutivos", "description": "Automóviles de alta gama para transporte VIP", "color_code": "#F97316"},
                {"name": "Equipos de Bodega", "description": "Montacargas y equipos de almacen premium", "color_code": "#EAB308"},
                {"name": "Vehiculos Electricos", "description": "Flota electrica de lujo y sustentable", "color_code": "#10B981"},
                {"name": "Vehículos Especializados", "description": "Vans y vehículos para transporte especializado", "color_code": "#8B5CF6"}
            ]
            for cat_data in categories:
                category = models.AssetCategory(**cat_data)
                db.add(category)
            db.commit()

        # Crear marcas si no existen
        if db.query(models.Brand).count() == 0:
            brands = [
                {"name": "Volvo", "country": "Suecia"},
                {"name": "Mercedes-Benz", "country": "Alemania"},
                {"name": "BMW", "country": "Alemania"},
                {"name": "Audi", "country": "Alemania"},
                {"name": "Toyota", "country": "Japon"},
                {"name": "Lexus", "country": "Japon"},
                {"name": "Porsche", "country": "Alemania"},
                {"name": "Scania", "country": "Suecia"}
            ]
            for brand_data in brands:
                brand = models.Brand(**brand_data)
                db.add(brand)
            db.commit()

        # Crear personal de mantenimiento si no existe
        if db.query(models.MaintenancePersonnel).count() == 0:
            personnel = [
                {"employee_code": "MECH001", "first_name": "Juan Carlos", "last_name": "Perez Lopez", "email": "juan.perez@luxchile.com"},
                {"employee_code": "MECH002", "first_name": "Maria Elena", "last_name": "Gonzalez Silva", "email": "maria.gonzalez@luxchile.com"},
                {"employee_code": "MECH003", "first_name": "Carlos Alberto", "last_name": "Ruiz Morales", "email": "carlos.ruiz@luxchile.com"},
                {"employee_code": "MECH004", "first_name": "Ana Patricia", "last_name": "Moreno Castro", "email": "ana.moreno@luxchile.com"},
                {"employee_code": "MECH005", "first_name": "Roberto Jose", "last_name": "Sanchez Diaz", "email": "roberto.sanchez@luxchile.com"},
                {"employee_code": "ELEC001", "first_name": "Pedro Luis", "last_name": "Torres Vega", "email": "pedro.torres@luxchile.com"}
            ]
            for person_data in personnel:
                person = models.MaintenancePersonnel(**person_data)
                db.add(person)
            db.commit()

        # Crear tipos de mantenimiento si no existen
        if db.query(models.MaintenanceType).count() == 0:
            maintenance_types = [
                {"name": "Mantenimiento Preventivo Completo", "category": "preventive", "description": "Revisión completa programada", "estimated_duration": 8},
                {"name": "Reparación Correctiva", "category": "corrective", "description": "Reparación de fallas", "estimated_duration": 6},
                {"name": "Analisis Predictivo", "category": "predictive", "description": "Analisis de condicion", "estimated_duration": 3}
            ]
            for type_data in maintenance_types:
                maint_type = models.MaintenanceType(**type_data)
                db.add(maint_type)
            db.commit()

    except Exception as e:
        logger.error(f"Error inicializando datos base: {e}")
        db.rollback()

# Rutas de Assets
@router.get("/assets")
def get_assets(db: Session = Depends(get_db)):
    """
    Obtiene todos los assets desde la base de datos.
    Los datos están definidos en los scripts SQL de inicialización.
    """
    try:
        # Inicializar datos base si es necesario
        initialize_base_data(db)
        
        # Obtener assets directamente de la base de datos
        assets = db.query(models.Asset).all()
        
        # Si no hay assets, significa que los scripts SQL no se han ejecutado
        if not assets:
            logger.warning("No se encontraron assets en la base de datos. Verifica que los scripts SQL se hayan ejecutado correctamente.")
            return []
        
        return [{"id": a.id, "name": clean_special_chars(a.name), "location": clean_special_chars(a.location), "status": a.status} for a in assets]
        
    except Exception as e:
        logger.error(f"Error obteniendo assets: {e}")
        # Retornar lista vacía en caso de error
        return []

@router.post("/assets", response_model=AssetResponse)
def create_asset(asset: AssetCreate, db: Session = Depends(get_db)):
    db_asset = models.Asset(**asset.dict())
    db.add(db_asset)
    db.commit()
    db.refresh(db_asset)
    return db_asset

# Rutas de Maintenance Tasks
@router.get("/tasks")
def get_maintenance_tasks(status: Optional[str] = None, db: Session = Depends(get_db)):
    """
    Obtiene las tareas de mantenimiento desde la base de datos.
    Las tareas están definidas en los scripts SQL de inicialización.
    """
    try:
        from sqlalchemy.orm import joinedload
        
        # Asegurar que existen assets
        get_assets(db)
        
        # Obtener tareas directamente de la base de datos CON EAGER LOADING
        query = db.query(models.MaintenanceTask)\
            .join(models.Asset)\
            .options(joinedload(models.MaintenanceTask.asset))\
            .options(joinedload(models.MaintenanceTask.maintenance_type))\
            .options(joinedload(models.MaintenanceTask.personnel))
        
        if status and status != 'all':
            query = query.filter(models.MaintenanceTask.status == status)
        
        tasks = query.all()
        
        # Si no hay tareas, las definidas en SQL no se han cargado aún
        if not tasks:
            logger.warning("No se encontraron tareas de mantenimiento en la base de datos.")
            return []

        # Mapear estados de inglés a español para el frontend
        status_map_response = {
            'pending': 'pendiente',
            'in_progress': 'en_progreso',
            'completed': 'completada'
        }

        # Formatear respuesta con nombre del asset
        result = []
        from datetime import timezone
        current_time = datetime.now(timezone.utc)
        
        for task in tasks:
            # Determinar si está vencido
            is_overdue = (task.due_date and 
                         task.due_date < current_time and 
                         task.status != 'completed')
            
            task_dict = {
                "id": task.id,
                "title": clean_special_chars(task.title),
                "description": clean_special_chars(task.description) if task.description else "",
                "status": status_map_response.get(task.status, task.status),
                "created_at": task.created_at.isoformat(),
                "due_date": task.due_date.isoformat() if task.due_date else None,
                "asset_name": clean_special_chars(task.asset.name) if task.asset else "Unknown",
                "task_type": task.maintenance_type.category if hasattr(task, 'maintenance_type') and task.maintenance_type else "preventive",
                "technician_assigned": f"{task.personnel.first_name} {task.personnel.last_name}" if hasattr(task, 'personnel') and task.personnel else "Sin asignar",
                "is_overdue": is_overdue
            }
            result.append(task_dict)

        # ORDENAR POR PRIORIDAD EN EL BACKEND
        def get_priority(task):
            if task.get('is_overdue'):
                return 0  # VENCIDOS PRIMERO
            status = task.get('status', '')
            if status == 'pendiente':
                return 1
            elif status == 'en_progreso':
                return 2
            elif status == 'completada':
                return 3
            return 4
        
        # Ordenar y devolver
        result.sort(key=get_priority)
        logger.info(f"Devolviendo {len(result)} tareas ordenadas por prioridad")
        
        return result
        
    except Exception as e:
        logger.error(f"Error obteniendo tareas de mantenimiento: {e}")
        return []

@router.put("/tasks/{task_id}")
def update_maintenance_task(task_id: str, task_update: dict, db: Session = Depends(get_db)):
    from sqlalchemy.orm import joinedload
    
    # Consultar tarea con eager loading de relaciones
    db_task = db.query(models.MaintenanceTask)\
        .options(joinedload(models.MaintenanceTask.asset))\
        .options(joinedload(models.MaintenanceTask.maintenance_type))\
        .options(joinedload(models.MaintenanceTask.personnel))\
        .filter(models.MaintenanceTask.id == task_id)\
        .first()
    
    if not db_task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    # Mapear estados de español a inglés
    status_map = {
        'pendiente': 'pending',
        'en_progreso': 'in_progress', 
        'completada': 'completed'
    }
    
    if 'status' in task_update:
        task_update['status'] = status_map.get(task_update['status'], task_update['status'])
    
    # Si se marca como completada, agregar timestamp
    if task_update.get('status') == 'completed' and not db_task.completed_at:
        task_update['completed_at'] = datetime.now()
    
    # Actualizar campos
    for key, value in task_update.items():
        if hasattr(db_task, key):
            setattr(db_task, key, value)
    
    db.commit()
    db.refresh(db_task)
    
    # Mapear estados de inglés a español para el frontend
    status_map_response = {
        'pending': 'pendiente',
        'in_progress': 'en_progreso',
        'completed': 'completada'
    }
    
    # Obtener task_type y technician de la base de datos (NO HARDCODEADO)
    task_type = "preventive"  # default
    if db_task.maintenance_type:
        task_type = db_task.maintenance_type.category
    
    technician_assigned = "Sin asignar"  # default
    if db_task.personnel:
        technician_assigned = f"{db_task.personnel.first_name} {db_task.personnel.last_name}"
    
    asset_name = "Unknown"  # default
    if db_task.asset:
        asset_name = clean_special_chars(db_task.asset.name)
    
    return {
        "id": db_task.id,
        "title": clean_special_chars(db_task.title),
        "description": clean_special_chars(db_task.description) if db_task.description else "",
        "status": status_map_response.get(db_task.status, db_task.status),
        "created_at": db_task.created_at.isoformat(),
        "due_date": db_task.due_date.isoformat() if db_task.due_date else None,
        "asset_name": asset_name,
        "task_type": task_type,
        "technician_assigned": technician_assigned
    }

@router.get("/tasks/stats")
def get_maintenance_stats(db: Session = Depends(get_db)):
    try:
        from datetime import datetime
        
        # Inicializar datos base si es necesario
        initialize_base_data(db)
        
        # Asegurar que existen tareas de demo
        get_maintenance_tasks(db=db)
        
        from datetime import timezone
        now = datetime.now(timezone.utc)
        
        total = db.query(models.MaintenanceTask).count()
        pending = db.query(models.MaintenanceTask).filter(models.MaintenanceTask.status == 'pending').count()
        in_progress = db.query(models.MaintenanceTask).filter(models.MaintenanceTask.status == 'in_progress').count()
        completed = db.query(models.MaintenanceTask).filter(models.MaintenanceTask.status == 'completed').count()
        
        # Calcular vencidas dinámicamente: tareas pendientes con fecha vencida
        overdue = db.query(models.MaintenanceTask).filter(
            models.MaintenanceTask.status == 'pending',
            models.MaintenanceTask.due_date.isnot(None),
            models.MaintenanceTask.due_date < now
        ).count()
        
        return {
            "total": total,
            "pending": pending,
            "in_progress": in_progress,
            "completed": completed,
            "overdue": overdue
        }
    except Exception as e:
        logger.error(f"Error obteniendo estadísticas: {e}")
        # Retornar estadísticas por defecto si hay error
        return {
            "total": 0,
            "pending": 0,
            "in_progress": 0,
            "completed": 0,
            "overdue": 0
        }

@router.post("/tasks")
def create_maintenance_task(task_data: MaintenanceTaskCreate, db: Session = Depends(get_db)):
    """Crear nueva tarea de mantenimiento"""
    try:
        # Validar que el asset existe
        asset = db.query(models.Asset).filter(models.Asset.id == task_data.asset_id).first()
        if not asset:
            raise HTTPException(status_code=404, detail="Asset no encontrado")
        
        # Crear nueva tarea
        new_task = models.MaintenanceTask(
            id=str(uuid.uuid4()),
            asset_id=task_data.asset_id,
            title=task_data.title,
            description=task_data.description or "",
            priority="medium",
            status="pending",
            scheduled_date=datetime.now(),
            due_date=datetime.strptime(task_data.due_date, "%Y-%m-%d") if task_data.due_date else datetime.now() + timedelta(days=7),
            estimated_duration=4
            # No asignamos técnico por ahora - assigned_to se queda como None por defecto
        )
        
        db.add(new_task)
        db.commit()
        db.refresh(new_task)
        
        # Mapear estados de inglés a español para el frontend
        status_map_response = {
            'pending': 'pendiente',
            'in_progress': 'en_progreso', 
            'completed': 'completada'
        }
        
        # Mapear tipo de tarea
        task_type = "preventive"
        if "correctiv" in new_task.title.lower():
            task_type = "corrective"
        elif "predictiv" in new_task.title.lower():
            task_type = "predictive"
        
        return {
            "id": new_task.id,
            "title": clean_special_chars(new_task.title),
            "description": clean_special_chars(new_task.description) if new_task.description else "",
            "status": status_map_response.get(new_task.status, new_task.status),
            "created_at": new_task.created_at.isoformat(),
            "due_date": new_task.due_date.isoformat() if new_task.due_date else None,
            "asset_name": clean_special_chars(asset.name),
            "task_type": task_type,
            "technician_assigned": None
        }
    except Exception as e:
        logger.error(f"Error creando tarea: {e}")
        db.rollback()
        raise

# HU8 - Endpoints para Recordatorios de Mantenimiento

@router.get("/reminders/stats")
def get_reminder_stats(db: Session = Depends(get_db)):
    """
    Obtiene estadísticas dinámicas de recordatorios correlacionadas con mantenimientos
    """
    try:
        # Usar la función de base de datos que actualiza dinámicamente
        try:
            result = db.execute("SELECT * FROM get_dynamic_reminder_stats()").fetchone()
            
            if result:
                return {
                    "total_active": result.total_active,
                    "overdue": result.overdue,
                    "due_soon": result.due_soon,
                    "critical_priority": result.critical_priority
                }
        except Exception as db_error:
            logger.warning(f"No se pudo usar la función dinámica de recordatorios: {db_error}")
        
        # Fallback: calcular manualmente con correlación directa a mantenimientos
        from datetime import datetime, timedelta
        
        now = datetime.now()
        seven_days_from_now = now + timedelta(days=7)
        
        # Próximos = tareas pendientes que vencen en 7 días (correlaciona con "Pendientes")
        due_soon = db.query(models.MaintenanceTask).filter(
            models.MaintenanceTask.status == 'pending',
            models.MaintenanceTask.due_date.isnot(None),
            models.MaintenanceTask.due_date.between(now, seven_days_from_now)
        ).count()
        
        # Vencidos = tareas pendientes con fecha pasada (correlaciona con "Vencidas")
        overdue = db.query(models.MaintenanceTask).filter(
            models.MaintenanceTask.status == 'pending',
            models.MaintenanceTask.due_date.isnot(None),
            models.MaintenanceTask.due_date < now
        ).count()
        
        # En proceso = tareas en progreso que requieren seguimiento
        in_process = db.query(models.MaintenanceTask).filter(
            models.MaintenanceTask.status == 'in_progress'
        ).count()
        
        # Total activo = solo los que requieren atención (NO completados)
        total_active = overdue + due_soon + in_process
        
        return {
            "total_active": total_active,
            "overdue": overdue,
            "due_soon": due_soon,
            "critical_priority": in_process  # En proceso como críticos que necesitan seguimiento
        }
        
    except Exception as e:
        logger.error(f"Error obteniendo estadísticas de recordatorios: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/reminders")
def get_reminders(db: Session = Depends(get_db)):
    """
    Obtiene recordatorios dinámicos usando la función de base de datos que actualiza automáticamente
    """
    try:
        # Usar la función de base de datos que actualiza dinámicamente los recordatorios
        try:
            result = db.execute("SELECT * FROM get_dynamic_reminders()").fetchall()
            
            reminders = []
            for row in result:
                # Calcular días hasta el vencimiento o días vencidos
                now = datetime.now()
                due_date = row.due_date.replace(tzinfo=None) if row.due_date and row.due_date.tzinfo else row.due_date
                
                if due_date:
                    if due_date > now:
                        days_before_due = (due_date - now).days
                    else:
                        days_before_due = -(now - due_date).days  # Negativo para vencidos
                else:
                    days_before_due = 0
                
                # Obtener datos reales del asset desde la base de datos
                asset = db.query(models.Asset).filter(models.Asset.id == row.asset_id).first()
                asset_code = asset.asset_code if asset and asset.asset_code else f"AST-{row.asset_id:03d}"
                
                # Obtener modelo del vehículo desde las relaciones
                asset_model = "Sin modelo"
                if asset and asset.vehicle_model:
                    model_name = asset.vehicle_model.name if asset.vehicle_model.name else ""
                    brand_name = asset.vehicle_model.brand.name if asset.vehicle_model.brand else ""
                    asset_model = f"{brand_name} {model_name}" if brand_name or model_name else "Sin modelo"
                
                reminder_data = {
                    "id": str(row.id),
                    "asset_id": row.asset_id,
                    "maintenance_task_id": str(row.maintenance_task_id),
                    "reminder_type": row.reminder_type,
                    "priority": row.priority,
                    "title": clean_special_chars(row.title),
                    "message": clean_special_chars(row.message),
                    "created_at": row.created_at.isoformat() if row.created_at else None,
                    "due_date": due_date.isoformat() if due_date else None,
                    "reminded_at": row.reminded_at.isoformat() if row.reminded_at else None,
                    "dismissed_at": row.dismissed_at.isoformat() if row.dismissed_at else None,
                    "is_active": row.is_active,
                    "is_dismissed": row.is_dismissed,
                    "days_before_due": days_before_due,
                    "asset_name": clean_special_chars(row.asset_name),
                    "asset_code": asset_code,
                    "asset_model": asset_model,
                    "task_title": clean_special_chars(row.title),
                    "task_status": row.task_status
                }
                reminders.append(reminder_data)
            
            return {"reminders": reminders}
            
        except Exception as db_error:
            logger.warning(f"No se pudo usar la función dinámica de recordatorios: {db_error}")
            # Fallback: usar el método anterior
            return get_reminders_from_tasks(db)
        
    except Exception as e:
        logger.error(f"Error obteniendo recordatorios: {e}")
        raise HTTPException(status_code=500, detail=str(e))

def get_reminders_from_tasks(db: Session):
    """
    Función fallback para generar recordatorios desde las tareas de mantenimiento vencidas
    """
    from datetime import datetime, timedelta
    
    now = datetime.now()
    seven_days_from_now = now + timedelta(days=7)
    
    # Buscar tareas próximas a vencer (próximos 7 días)  
    upcoming_tasks = db.query(models.MaintenanceTask).join(
        models.Asset, models.MaintenanceTask.asset_id == models.Asset.id
    ).filter(
        models.MaintenanceTask.status == 'pending',
        models.MaintenanceTask.due_date.isnot(None),
        models.MaintenanceTask.due_date.between(now, seven_days_from_now)
    ).all()
    
    # Buscar tareas vencidas
    overdue_tasks = db.query(models.MaintenanceTask).join(
        models.Asset, models.MaintenanceTask.asset_id == models.Asset.id
    ).filter(
        models.MaintenanceTask.status == 'pending',
        models.MaintenanceTask.due_date.isnot(None),
        models.MaintenanceTask.due_date < now
    ).all()
    
    reminders = []
    
    # Procesar tareas próximas a vencer
    for task in upcoming_tasks:
        asset = task.asset
        task_due_date = task.due_date.replace(tzinfo=None) if task.due_date.tzinfo else task.due_date
        days_until_due = (task_due_date - now).days
        
        # Obtener modelo del vehículo desde las relaciones
        asset_model = "Sin modelo"
        if asset.vehicle_model:
            model_name = asset.vehicle_model.name if asset.vehicle_model.name else ""
            brand_name = asset.vehicle_model.brand.name if asset.vehicle_model.brand else ""
            asset_model = f"{brand_name} {model_name}" if brand_name or model_name else "Sin modelo"
        
        reminder_data = {
            "id": f"upcoming_{task.id}",
            "asset_id": task.asset_id,
            "maintenance_task_id": task.id,
            "reminder_type": "due_soon",
            "priority": "medium" if days_until_due > 3 else "high",
            "title": f"Mantenimiento proximo - {clean_special_chars(asset.name)}",
            "message": f"El vehiculo {clean_special_chars(asset.name)} tiene mantenimiento programado en {days_until_due} dias. Tarea: {clean_special_chars(task.title)}",
            "created_at": now.isoformat(),
            "due_date": task_due_date.isoformat(),
            "reminded_at": None,
            "dismissed_at": None,
            "is_active": True,
            "is_dismissed": False,
            "days_before_due": days_until_due,
            "asset_name": clean_special_chars(asset.name),
            "asset_code": asset.asset_code if asset.asset_code else f"AST-{asset.id:03d}",
            "asset_model": asset_model,
            "task_title": clean_special_chars(task.title),
            "task_status": task.status
        }
        reminders.append(reminder_data)
    
    # Procesar tareas vencidas
    for task in overdue_tasks:
        asset = task.asset
        task_due_date = task.due_date.replace(tzinfo=None) if task.due_date.tzinfo else task.due_date
        days_overdue = (now - task_due_date).days
        
        # Obtener modelo del vehículo desde las relaciones
        asset_model = "Sin modelo"
        if asset.vehicle_model:
            model_name = asset.vehicle_model.name if asset.vehicle_model.name else ""
            brand_name = asset.vehicle_model.brand.name if asset.vehicle_model.brand else ""
            asset_model = f"{brand_name} {model_name}" if brand_name or model_name else "Sin modelo"
        
        reminder_data = {
            "id": f"overdue_{task.id}",
            "asset_id": task.asset_id,
            "maintenance_task_id": task.id,
            "reminder_type": "overdue",
            "priority": "critical" if days_overdue > 7 else "high",
            "title": f"Mantenimiento vencido! - {clean_special_chars(asset.name)}",
            "message": f"El vehiculo {clean_special_chars(asset.name)} tiene mantenimiento vencido hace {days_overdue} dias. Tarea: {clean_special_chars(task.title)}",
            "created_at": now.isoformat(),
            "due_date": task_due_date.isoformat(),
            "reminded_at": None,
            "dismissed_at": None,
            "is_active": True,
            "is_dismissed": False,
            "days_before_due": -days_overdue,
            "asset_name": clean_special_chars(asset.name),
            "asset_code": asset.asset_code if asset.asset_code else f"AST-{asset.id:03d}",
            "asset_model": asset_model,
            "task_title": clean_special_chars(task.title),
            "task_status": task.status
        }
        reminders.append(reminder_data)
    
    # Ordenar por prioridad y fecha
    priority_order = {"critical": 0, "high": 1, "medium": 2, "low": 3}
    reminders.sort(key=lambda x: (priority_order.get(x["priority"], 4), x["due_date"]))
    
    return {"reminders": reminders}

@router.post("/reminders/refresh")
def refresh_reminders(db: Session = Depends(get_db)):
    """
    Fuerza la actualización de todos los recordatorios basándose en el estado actual de las tareas
    """
    try:
        # Ejecutar la función de actualización dinámica
        db.execute("SELECT refresh_dynamic_reminders()")
        db.commit()
        
        # Retornar estadísticas actualizadas
        result = db.execute("SELECT * FROM get_dynamic_reminder_stats()").fetchone()
        
        if result:
            return {
                "success": True,
                "message": "Recordatorios actualizados exitosamente",
                "stats": {
                    "total_active": result.total_active,
                    "overdue": result.overdue,
                    "due_soon": result.due_soon,
                    "critical_priority": result.critical_priority
                }
            }
        else:
            return {
                "success": True,
                "message": "Recordatorios actualizados (fallback)",
                "stats": {
                    "total_active": 0,
                    "overdue": 0,
                    "due_soon": 0,
                    "critical_priority": 0
                }
            }
        
    except Exception as e:
        logger.error(f"Error actualizando recordatorios: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error actualizando recordatorios: {str(e)}")