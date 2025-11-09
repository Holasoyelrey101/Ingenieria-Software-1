from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, ForeignKey
from sqlalchemy.sql import func
from datetime import datetime
from .db import Base


class RouteRequest(Base):
    __tablename__ = 'route_requests'
    id = Column(Integer, primary_key=True, index=True)
    origin = Column(String(128))
    destination = Column(String(128))
    payload = Column(Text)
    response = Column(Text)
    status = Column(String(32))
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class VehicleCamera(Base):
    __tablename__ = "vehicle_cameras"
    
    id = Column(Integer, primary_key=True, index=True)
    # Usar Integer sin ForeignKey para evitar problemas de validación si la tabla vehicles no está en el mismo schema
    vehicle_id = Column(Integer, nullable=False)
    camera_id = Column(String(50), nullable=False)
    camera_name = Column(String(100))
    position = Column(String(50))
    stream_url = Column(Text)
    active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)
