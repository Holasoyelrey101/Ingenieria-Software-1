from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class ProductoOut(BaseModel):
    id: int
    sku: str
    nombre: str
    categoria: Optional[str] = None
    precio: Optional[float] = None
    class Config:
        orm_mode = True

class StockItem(BaseModel):
    producto_id: int
    sku: Optional[str] = None
    nombre: Optional[str] = None
    cantidad: int
    class Config:
        orm_mode = True

class MovementIn(BaseModel):
    producto_id: int
    bodega_id: int
    tipo: str  # IN | OUT | TRANSFER
    cantidad: int
    motivo: Optional[str] = None

class AlertOut(BaseModel):
    id: int
    producto_id: int
    bodega_id: Optional[int]
    tipo: Optional[str]
    mensaje: Optional[str]
    leida: bool
    class Config:
        orm_mode = True

# HU8 - Schemas para Recordatorios de Mantenimiento
class MaintenanceReminderOut(BaseModel):
    id: str
    asset_id: int
    maintenance_task_id: str
    reminder_type: str
    priority: str
    title: str
    message: str
    created_at: datetime
    due_date: datetime
    reminded_at: Optional[datetime] = None
    dismissed_at: Optional[datetime] = None
    is_active: bool
    is_dismissed: bool
    days_before_due: int
    
    # Información del asset
    asset_name: Optional[str] = None
    asset_code: Optional[str] = None
    asset_model: Optional[str] = None
    
    # Información de la tarea
    task_title: Optional[str] = None
    task_status: Optional[str] = None
    
    class Config:
        orm_mode = True

class ReminderStatsOut(BaseModel):
    total_active: int
    overdue: int
    due_soon: int
    critical_priority: int
