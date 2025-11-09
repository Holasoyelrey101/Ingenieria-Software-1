from sqlalchemy import Column, Integer, String, Text, DateTime, JSON, ForeignKey, Date, Numeric
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from .db import Base


class DeliveryRequest(Base):
    __tablename__ = 'delivery_requests'
    id = Column(Integer, primary_key=True, index=True)
    # ✅ SINCRONIZADO CON BD REAL (001b_delivery_base.sql)
    origin_address = Column(Text, nullable=True)
    destination_address = Column(Text, nullable=True)
    origin_lat = Column(Numeric(10, 8), nullable=True)
    origin_lng = Column(Numeric(11, 8), nullable=True)
    dest_lat = Column(Numeric(10, 8), nullable=True)
    dest_lng = Column(Numeric(11, 8), nullable=True)
    customer_name = Column(String(255), nullable=True)
    customer_phone = Column(String(20), nullable=True)
    status = Column(String(50), nullable=False, default='pending')
    priority = Column(Integer, nullable=True, default=0)
    vehicle_id = Column(Integer, nullable=True)  # ✅ Cambiado de String a Integer
    driver_id = Column(Integer, nullable=True)   # ✅ Agregado para FK
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # New relationships for integration
    route_assignments = relationship("RouteAssignment", back_populates="delivery_request")


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
    # ✅ SINCRONIZADO: columna 'seq' en BD, mapeada como 'sequence' en modelo
    sequence = Column('seq', Integer, nullable=False)
    # ID de la orden original (para trazabilidad HU3)
    order_id = Column(Integer, nullable=True)
    # Ubicación de la parada {lat: float, lng: float, address: string}
    location = Column(JSON, nullable=False)

    route = relationship("Route", back_populates="stops")


# ====== MODELOS PARA INTEGRACIÓN DE VEHÍCULOS ======
class Vehicle(Base):
    __tablename__ = "vehicles"
    
    id = Column(Integer, primary_key=True, index=True)
    license_plate = Column(String(10), unique=True, nullable=False, index=True)
    brand = Column(String(50))
    model = Column(String(100))
    year = Column(Integer)
    capacity_kg = Column(Integer, default=1000)
    capacity_m3 = Column(Numeric(8, 2), default=5.0)
    fuel_type = Column(String(20), default='gasoline')
    status = Column(String(20), default='active', index=True)  # 'active', 'maintenance', 'inactive', 'repair'
    last_maintenance = Column(Date)
    next_maintenance = Column(Date, index=True)
    mileage_km = Column(Integer, default=0)
    notes = Column(Text)
    created_at = Column(DateTime(timezone=True), default=func.now())
    updated_at = Column(DateTime(timezone=True), default=func.now(), onupdate=func.now())

    # Relationships
    route_assignments = relationship("RouteAssignment", back_populates="vehicle")
    maintenance_logs = relationship("VehicleMaintenanceLog", back_populates="vehicle")


class RouteAssignment(Base):
    __tablename__ = "route_assignments"
    
    id = Column(Integer, primary_key=True, index=True)
    delivery_request_id = Column(Integer, ForeignKey("delivery_requests.id"), nullable=False, index=True)
    driver_id = Column(Integer, nullable=False, index=True)  # Soft reference to ms-rrhh
    vehicle_id = Column(Integer, ForeignKey("vehicles.id"), nullable=False, index=True)
    assigned_by = Column(String(100))
    assigned_at = Column(DateTime(timezone=True), default=func.now())
    status = Column(String(20), default='assigned', index=True)  # 'assigned', 'in_progress', 'completed', 'cancelled'
    notes = Column(Text)
    
    # Relationships
    delivery_request = relationship("DeliveryRequest", back_populates="route_assignments")
    vehicle = relationship("Vehicle", back_populates="route_assignments")


class VehicleMaintenanceLog(Base):
    __tablename__ = "vehicle_maintenance_log"
    
    id = Column(Integer, primary_key=True, index=True)
    vehicle_id = Column(Integer, ForeignKey("vehicles.id"), nullable=False, index=True)
    maintenance_type = Column(String(50), nullable=False, index=True)  # 'preventive', 'corrective', 'inspection'
    description = Column(Text)
    cost = Column(Numeric(10, 2))
    performed_by = Column(String(100))
    performed_at = Column(DateTime(timezone=True), default=func.now(), index=True)
    next_due_date = Column(Date)
    mileage_at_service = Column(Integer)
    
    # Relationships
    vehicle = relationship("Vehicle", back_populates="maintenance_logs")
