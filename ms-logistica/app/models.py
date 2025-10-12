from sqlalchemy import Column, Integer, String, Text, DateTime, JSON, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from .db import Base


class DeliveryRequest(Base):
    __tablename__ = 'delivery_requests'
    id = Column(Integer, primary_key=True, index=True)
    origin = Column(JSON, nullable=True)
    destination = Column(JSON, nullable=True)
    vehicle_id = Column(String(64), nullable=True)
    status = Column(String(32), nullable=False, default='pending')
    eta = Column(Integer, nullable=True)  # estimated seconds
    payload = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class Incident(Base):
    __tablename__ = 'incidents'
    id = Column(Integer, primary_key=True, index=True)
    # Link to a delivery request for traceability
    delivery_request_id = Column(Integer, nullable=True)
    route_id = Column(Integer, nullable=True)
    route_stop_id = Column(Integer, nullable=True)
    vehicle_id = Column(Integer, nullable=True)
    driver_id = Column(Integer, nullable=True)
    severity = Column(String(16), nullable=True)
    type = Column(String(64), nullable=True)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


# ====== MODELOS PARA RUTAS (HU3/HU4) ======
class Route(Base):
    __tablename__ = "routes"
    id = Column(Integer, primary_key=True, index=True)
    # Distancia total en metros y duración en segundos (estimada)
    distance_m = Column(Integer, nullable=True)
    duration_s = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relación con paradas
    stops = relationship("RouteStop", back_populates="route", cascade="all, delete-orphan")


class RouteStop(Base):
    __tablename__ = "route_stops"
    id = Column(Integer, primary_key=True, index=True)
    route_id = Column(Integer, ForeignKey("routes.id", ondelete="CASCADE"), index=True)
    # Secuencia de visita dentro de la ruta (1..N)
    sequence = Column(Integer, nullable=False)
    # ID de la orden original (para trazabilidad HU3)
    order_id = Column(Integer, nullable=True)
    # Ubicación de la parada {lat: float, lng: float}
    location = Column(JSON, nullable=False)

    route = relationship("Route", back_populates="stops")
