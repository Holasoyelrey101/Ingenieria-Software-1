from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from app.db import get_db
from app import models
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timedelta
import uuid
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/maintenance", tags=["maintenance"])

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

# Datos de demo para assets
demo_assets = [
    {
        "name": "Camión Volvo FH-001 Luxury Transport",
        "location": "Terminal Puerto Santiago",
        "status": "active"
    },
    {
        "name": "Mercedes Actros A-002 Premium Cargo",
        "location": "Centro Distribución Las Condes", 
        "status": "active"
    },
    {
        "name": "BMW X7 B-003 Executive Transport",
        "location": "Showroom Providencia",
        "status": "active"
    },
    {
        "name": "Mercedes Sprinter S-004 Luxury Van",
        "location": "Terminal Aeroporto SCL",
        "status": "maintenance"
    },
    {
        "name": "Montacargas Toyota 8FG25-005",
        "location": "Bodega Artículos Premium",
        "status": "active"
    },
    {
        "name": "Audi Q8 A-006 VIP Transport",
        "location": "Base Vitacura",
        "status": "active"
    },
    {
        "name": "Mercedes EQS E-007 Electric Luxury",
        "location": "Estación de Carga Premium",
        "status": "active"
    },
    {
        "name": "Scania R450 S-008 High-End Cargo",
        "location": "Terminal Puerto Valparaíso",
        "status": "maintenance"
    }
]

# Función helper para asignar técnicos
def assign_technician_by_task(title: str, priority: str) -> str:
    """Asignar técnico basado en el tipo de tarea y prioridad"""
    technicians = {
        "vip_specialist": "Juan Carlos Pérez",
        "luxury_specialist": "María Elena González", 
        "premium_service": "Carlos Alberto Ruiz",
        "electrical_luxury": "Pedro Luis Torres",
        "detailing_premium": "Ana Patricia Moreno",
        "general_luxury": "Roberto José Sánchez"
    }
    
    title_lower = title.lower()
    
    if "eléctrico" in title_lower or "mercedes eqs" in title_lower or "software" in title_lower:
        return technicians["electrical_luxury"]
    elif "vip" in title_lower or "executive" in title_lower or "bmw" in title_lower:
        return technicians["vip_specialist"]
    elif "premium" in title_lower or "luxury" in title_lower:
        return technicians["luxury_specialist"]
    elif "detailing" in title_lower or "limpieza" in title_lower:
        return technicians["detailing_premium"]
    elif priority == "high":
        return technicians["vip_specialist"]
    elif priority == "medium":
        return technicians["luxury_specialist"]
    else:
        return technicians["general_luxury"]

# Función para inicializar datos base
def initialize_base_data(db: Session):
    """Inicializar datos base necesarios para el sistema de mantenimiento"""
    try:
        # Crear categorías de activos si no existen
        if db.query(models.AssetCategory).count() == 0:
            categories = [
                {"name": "Vehículos de Carga Premium", "description": "Camiones especializados en transporte de lujo", "color_code": "#EF4444"},
                {"name": "Vehículos Ejecutivos", "description": "Automóviles de alta gama para transporte VIP", "color_code": "#F97316"},
                {"name": "Equipos de Bodega", "description": "Montacargas y equipos de almacén premium", "color_code": "#EAB308"},
                {"name": "Vehículos Eléctricos", "description": "Flota eléctrica de lujo y sustentable", "color_code": "#10B981"},
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
                {"name": "Toyota", "country": "Japón"},
                {"name": "Lexus", "country": "Japón"},
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
                {"employee_code": "MECH001", "first_name": "Juan Carlos", "last_name": "Pérez López", "email": "juan.perez@luxchile.com"},
                {"employee_code": "MECH002", "first_name": "María Elena", "last_name": "González Silva", "email": "maria.gonzalez@luxchile.com"},
                {"employee_code": "MECH003", "first_name": "Carlos Alberto", "last_name": "Ruiz Morales", "email": "carlos.ruiz@luxchile.com"},
                {"employee_code": "MECH004", "first_name": "Ana Patricia", "last_name": "Moreno Castro", "email": "ana.moreno@luxchile.com"},
                {"employee_code": "MECH005", "first_name": "Roberto José", "last_name": "Sánchez Díaz", "email": "roberto.sanchez@luxchile.com"},
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
                {"name": "Análisis Predictivo", "category": "predictive", "description": "Análisis de condición", "estimated_duration": 3}
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
    # Inicializar datos base
    initialize_base_data(db)
    
    # Crear assets de demo si no existen
    existing_count = db.query(models.Asset).count()
    if existing_count == 0:
        for asset_data in demo_assets:
            asset = models.Asset(**asset_data)
            db.add(asset)
        db.commit()
    
    assets = db.query(models.Asset).all()
    return [{"id": a.id, "name": a.name, "location": a.location, "status": a.status} for a in assets]

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
    # Asegurar que existen assets
    get_assets(db)
    
    # Crear tareas de demo si no existen
    existing_tasks = db.query(models.MaintenanceTask).count()
    if existing_tasks == 0:
        assets = db.query(models.Asset).all()
        if assets:
            demo_tasks = [
                {
                    "id": str(uuid.uuid4()),
                    "asset_id": assets[0].id,
                    "title": "Mantenimiento Preventivo - Volvo Luxury Transport",
                    "description": "Cambio de aceite premium, filtros de alta gama, revisión de sistemas de climatización",
                    "priority": "high",
                    "status": "pending",
                    "scheduled_date": datetime(2025, 10, 25),
                    "due_date": datetime(2025, 10, 27),
                    "estimated_duration": 4
                },
                {
                    "id": str(uuid.uuid4()),
                    "asset_id": assets[1].id if len(assets) > 1 else assets[0].id,
                    "title": "Revisión Sistema de Carga - Mercedes Premium",
                    "description": "Revisión de sistema de sujeción para artículos de lujo y temperatura controlada",
                    "priority": "medium",
                    "status": "in_progress",
                    "scheduled_date": datetime(2025, 10, 23),
                    "due_date": datetime(2025, 10, 24),
                    "estimated_duration": 6
                },
                {
                    "id": str(uuid.uuid4()),
                    "asset_id": assets[2].id if len(assets) > 2 else assets[0].id,
                    "title": "Inspección VIP - BMW X7 Executive",
                    "description": "Limpieza premium, revisión de sistemas de entretenimiento y confort",
                    "priority": "high",
                    "status": "completed",
                    "scheduled_date": datetime(2025, 10, 20),
                    "due_date": datetime(2025, 10, 22),
                    "estimated_duration": 3,
                    "completed_at": datetime(2025, 10, 21)
                },
                {
                    "id": str(uuid.uuid4()),
                    "asset_id": assets[3].id if len(assets) > 3 else assets[0].id,
                    "title": "Servicio Premium - Mercedes Sprinter Luxury",
                    "description": "Detailing completo, revisión de sistemas de climatización y audio premium",
                    "priority": "high",
                    "status": "pending",
                    "scheduled_date": datetime(2025, 10, 24),
                    "due_date": datetime(2025, 10, 26),
                    "estimated_duration": 5
                },
                {
                    "id": str(uuid.uuid4()),
                    "asset_id": assets[4].id if len(assets) > 4 else assets[0].id,
                    "title": "Mantenimiento Especializado - Montacargas Premium",
                    "description": "Calibración de sistemas de manejo delicado para artículos de lujo",
                    "priority": "medium",
                    "status": "in_progress",
                    "scheduled_date": datetime(2025, 10, 22),
                    "due_date": datetime(2025, 10, 23),
                    "estimated_duration": 4
                },
                {
                    "id": str(uuid.uuid4()),
                    "asset_id": assets[5].id if len(assets) > 5 else assets[0].id,
                    "title": "Inspección VIP - Audi Q8 Transport",
                    "description": "Revisión completa de sistemas, limpieza premium y verificación de confort",
                    "priority": "medium",
                    "status": "completed",
                    "scheduled_date": datetime(2025, 10, 18),
                    "due_date": datetime(2025, 10, 20),
                    "estimated_duration": 3,
                    "completed_at": datetime(2025, 10, 19)
                },
                {
                    "id": str(uuid.uuid4()),
                    "asset_id": assets[6].id if len(assets) > 6 else assets[0].id,
                    "title": "Mantenimiento Eléctrico - Mercedes EQS",
                    "description": "Revisión de batería, sistemas de carga y software de última generación",
                    "priority": "high",
                    "status": "pending",
                    "scheduled_date": datetime(2025, 10, 26),
                    "due_date": datetime(2025, 10, 28),
                    "estimated_duration": 6
                },
                {
                    "id": str(uuid.uuid4()),
                    "asset_id": assets[7].id if len(assets) > 7 else assets[0].id,
                    "title": "Reparación Especializada - Scania High-End",
                    "description": "Reparación de sistema de refrigeración para transporte de productos sensibles",
                    "priority": "high",
                    "status": "pending",
                    "scheduled_date": datetime(2025, 10, 28),
                    "due_date": datetime(2025, 11, 2),
                    "estimated_duration": 16
                },
                {
                    "id": str(uuid.uuid4()),
                    "asset_id": assets[0].id,
                    "title": "Certificación de Seguridad - Volvo Luxury",
                    "description": "Certificación para transporte de artículos de alto valor, revisión de sistemas de seguridad",
                    "priority": "medium",
                    "status": "completed",
                    "scheduled_date": datetime(2025, 10, 15),
                    "due_date": datetime(2025, 10, 17),
                    "estimated_duration": 2,
                    "completed_at": datetime(2025, 10, 16)
                },
                {
                    "id": str(uuid.uuid4()),
                    "asset_id": assets[2].id if len(assets) > 2 else assets[0].id,
                    "title": "Actualización de Software - BMW X7",
                    "description": "Actualización de sistemas de navegación y entretenimiento premium",
                    "priority": "medium",
                    "status": "in_progress",
                    "scheduled_date": datetime(2025, 10, 24),
                    "due_date": datetime(2025, 10, 25),
                    "estimated_duration": 3
                }
            ]
            
            for task_data in demo_tasks:
                task = models.MaintenanceTask(**task_data)
                db.add(task)
            db.commit()
    
    query = db.query(models.MaintenanceTask).join(models.Asset)
    
    if status and status != 'all':
        query = query.filter(models.MaintenanceTask.status == status)
    
    tasks = query.all()
    
    # Mapear estados de inglés a español para el frontend
    status_map_response = {
        'pending': 'pendiente',
        'in_progress': 'en_progreso',
        'completed': 'completada'
    }
    
    # Formatear respuesta con nombre del asset
    result = []
    for task in tasks:
        task_dict = {
            "id": task.id,
            "title": task.title,
            "description": task.description,
            "status": status_map_response.get(task.status, task.status),
            "created_at": task.created_at.isoformat(),
            "due_date": task.due_date.isoformat() if task.due_date else None,
            "asset_name": task.asset.name if task.asset else "Unknown",
            "task_type": task.task_type if hasattr(task, 'task_type') else ("preventive" if "preventiv" in task.title.lower() else "corrective" if "correct" in task.title.lower() else "predictive"),
            "technician_assigned": assign_technician_by_task(task.title, task.priority)
        }
        result.append(task_dict)
    
    return result

# Primera función POST eliminada - usando solo la versión mejorada más abajo

@router.put("/tasks/{task_id}")
def update_maintenance_task(task_id: str, task_update: dict, db: Session = Depends(get_db)):
    db_task = db.query(models.MaintenanceTask).filter(models.MaintenanceTask.id == task_id).first()
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
    
    asset = db.query(models.Asset).filter(models.Asset.id == db_task.asset_id).first()
    
    # Mapear estados de inglés a español para el frontend
    status_map_response = {
        'pending': 'pendiente',
        'in_progress': 'en_progreso',
        'completed': 'completada'
    }
    
    return {
        "id": db_task.id,
        "title": db_task.title,
        "description": db_task.description,
        "status": status_map_response.get(db_task.status, db_task.status),
        "created_at": db_task.created_at.isoformat(),
        "due_date": db_task.due_date.isoformat() if db_task.due_date else None,
        "asset_name": asset.name if asset else "Unknown",
        "task_type": "preventive" if "preventiv" in db_task.title.lower() else "corrective" if "correct" in db_task.title.lower() else "predictive",
        "technician_assigned": assign_technician_by_task(db_task.title, db_task.priority)
    }

@router.get("/tasks/stats")
def get_maintenance_stats(db: Session = Depends(get_db)):
    try:
        # Inicializar datos base si es necesario
        initialize_base_data(db)
        
        # Asegurar que existen tareas de demo
        get_maintenance_tasks(db=db)
        
        total = db.query(models.MaintenanceTask).count()
        pending = db.query(models.MaintenanceTask).filter(models.MaintenanceTask.status == 'pending').count()
        in_progress = db.query(models.MaintenanceTask).filter(models.MaintenanceTask.status == 'in_progress').count()
        completed = db.query(models.MaintenanceTask).filter(models.MaintenanceTask.status == 'completed').count()
        overdue = db.query(models.MaintenanceTask).filter(models.MaintenanceTask.status == 'overdue').count()
        
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
            "title": new_task.title,
            "description": new_task.description,
            "status": status_map_response.get(new_task.status, new_task.status),
            "created_at": new_task.created_at.isoformat(),
            "due_date": new_task.due_date.isoformat() if new_task.due_date else None,
            "asset_name": asset.name,
            "task_type": task_type,
            "technician_assigned": None
        }
    except Exception as e:
        logger.error(f"Error creando tarea: {e}")
        db.rollback()
        raise