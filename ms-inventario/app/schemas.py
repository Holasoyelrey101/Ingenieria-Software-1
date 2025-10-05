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
