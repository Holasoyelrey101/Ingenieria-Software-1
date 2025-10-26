import sys, os
from sqlalchemy import Column, Integer, String, Text, DateTime
from sqlalchemy.sql import func
from .db import Base

# 🔹 Agregar ruta raíz del proyecto para acceder a ms_logistica
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

try:
    from ms_logistica.camion import Camion
except ModuleNotFoundError:
    Camion = None  # Permite que el proyecto siga corriendo si el módulo no existe

class RouteRequest(Base):
    __tablename__ = 'route_requests'
    id = Column(Integer, primary_key=True, index=True)
    origin = Column(String(128))
    destination = Column(String(128))
    payload = Column(Text)
    response = Column(Text)
    status = Column(String(32))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
