from sqlalchemy import Column, Integer, String, Text, ForeignKey, Boolean, DateTime, UniqueConstraint, Numeric
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.db import Base

class Bodega(Base):
    __tablename__ = 'bodegas'
    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(128), nullable=False)
    ubicacion = Column(String(200))

class Producto(Base):
    __tablename__ = 'productos'
    id = Column(Integer, primary_key=True, index=True)
    sku = Column(String(64), unique=True, nullable=False)
    nombre = Column(String(150), nullable=False)
    categoria = Column(String(100))
    precio = Column(Numeric(10, 2))

class Stock(Base):
    __tablename__ = 'stock'
    id = Column(Integer, primary_key=True, index=True)
    bodega_id = Column(Integer, ForeignKey('bodegas.id', ondelete='CASCADE'))
    producto_id = Column(Integer, ForeignKey('productos.id', ondelete='CASCADE'))
    cantidad = Column(Integer, nullable=False, default=0)
    __table_args__ = (UniqueConstraint('bodega_id','producto_id', name='uix_bodega_producto'),)
    bodega = relationship('Bodega')
    producto = relationship('Producto')

class Movimiento(Base):
    __tablename__ = 'movimientos'
    id = Column(Integer, primary_key=True, index=True)
    producto_id = Column(Integer, ForeignKey('productos.id', ondelete='CASCADE'))
    origen_id = Column(Integer, ForeignKey('bodegas.id'))
    destino_id = Column(Integer, ForeignKey('bodegas.id'))
    cantidad = Column(Integer, nullable=False)
    fecha = Column(DateTime(timezone=True), server_default=func.now())

class UmbralStock(Base):
    __tablename__ = 'umbrales_stock'
    id = Column(Integer, primary_key=True, index=True)
    producto_id = Column(Integer, ForeignKey('productos.id', ondelete='CASCADE'))
    bodega_id = Column(Integer, ForeignKey('bodegas.id', ondelete='CASCADE'))
    minimo = Column(Integer, nullable=False)

class Alerta(Base):
    __tablename__ = 'alertas'
    id = Column(Integer, primary_key=True, index=True)
    producto_id = Column(Integer, ForeignKey('productos.id'))
    bodega_id = Column(Integer, ForeignKey('bodegas.id'))
    tipo = Column(String(50))
    mensaje = Column(Text)
    fecha = Column(DateTime(timezone=True), server_default=func.now())
    leida = Column(Boolean, default=False)

# ======================================================
# MODELOS PARA SISTEMA DE MANTENIMIENTO ROBUSTO
# ======================================================

class AssetCategory(Base):
    __tablename__ = 'asset_categories'
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False, unique=True)
    description = Column(Text)
    color_code = Column(String(7), default='#3B82F6')
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Brand(Base):
    __tablename__ = 'brands'
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False, unique=True)
    country = Column(String(50))
    website = Column(String(255))
    support_phone = Column(String(20))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class VehicleType(Base):
    __tablename__ = 'vehicle_types'
    id = Column(Integer, primary_key=True, index=True)
    category_id = Column(Integer, ForeignKey('asset_categories.id', ondelete='CASCADE'))
    name = Column(String(100), nullable=False)
    description = Column(Text)
    default_maintenance_interval = Column(Integer, default=30)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    category = relationship('AssetCategory')

class VehicleModel(Base):
    __tablename__ = 'vehicle_models'
    id = Column(Integer, primary_key=True, index=True)
    brand_id = Column(Integer, ForeignKey('brands.id', ondelete='CASCADE'))
    vehicle_type_id = Column(Integer, ForeignKey('vehicle_types.id', ondelete='CASCADE'))
    name = Column(String(100), nullable=False)
    year_from = Column(Integer)
    year_to = Column(Integer)
    engine_type = Column(String(50))
    fuel_type = Column(String(30))
    specifications = Column(Text)  # JSON como string
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    brand = relationship('Brand')
    vehicle_type = relationship('VehicleType')

class Asset(Base):
    __tablename__ = 'assets'
    id = Column(Integer, primary_key=True, index=True)
    asset_code = Column(String(50), unique=True)
    name = Column(String(150), nullable=False)
    vehicle_model_id = Column(Integer, ForeignKey('vehicle_models.id'))
    serial_number = Column(String(100))
    license_plate = Column(String(20))
    vin_number = Column(String(30))
    location = Column(String(200))
    status = Column(String(30), default='active')
    acquisition_date = Column(DateTime(timezone=True))
    warranty_end_date = Column(DateTime(timezone=True))
    purchase_price = Column(Numeric(12, 2))
    current_value = Column(Numeric(12, 2))
    mileage = Column(Integer, default=0)
    engine_hours = Column(Integer, default=0)
    last_inspection_date = Column(DateTime(timezone=True))
    next_inspection_date = Column(DateTime(timezone=True))
    insurance_policy = Column(String(100))
    insurance_expiry = Column(DateTime(timezone=True))
    notes = Column(Text)
    asset_metadata = Column(Text)  # JSON como string
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    vehicle_model = relationship('VehicleModel')

class MaintenancePersonnel(Base):
    __tablename__ = 'maintenance_personnel'
    id = Column(Integer, primary_key=True, index=True)
    employee_code = Column(String(50), unique=True, nullable=False)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    email = Column(String(255), unique=True)
    phone = Column(String(20))
    specializations = Column(Text)  # JSON array como string
    certification_level = Column(String(20), default='basic')
    hire_date = Column(DateTime(timezone=True))
    status = Column(String(20), default='active')
    hourly_rate = Column(Numeric(8, 2))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class MaintenanceType(Base):
    __tablename__ = 'maintenance_types'
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False, unique=True)
    category = Column(String(30), nullable=False)
    description = Column(Text)
    estimated_duration = Column(Integer)
    frequency_days = Column(Integer)
    priority_level = Column(Integer, default=3)
    cost_estimate = Column(Numeric(10, 2))
    required_certifications = Column(Text)  # JSON array como string
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class MaintenanceTask(Base):
    __tablename__ = 'maintenance_tasks'
    id = Column(String(50), primary_key=True, index=True)  # UUID como string
    task_code = Column(String(50), unique=True)
    asset_id = Column(Integer, ForeignKey('assets.id', ondelete='CASCADE'))
    maintenance_type_id = Column(Integer, ForeignKey('maintenance_types.id'))
    assigned_to = Column(Integer, ForeignKey('maintenance_personnel.id'))
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=False)
    priority = Column(String(20), default='medium')
    status = Column(String(30), default='pending')
    
    # Fechas y tiempo
    scheduled_date = Column(DateTime(timezone=True))
    due_date = Column(DateTime(timezone=True))
    started_at = Column(DateTime(timezone=True))
    completed_at = Column(DateTime(timezone=True))
    estimated_duration = Column(Integer)
    actual_duration = Column(Integer)
    
    # Costos
    estimated_cost = Column(Numeric(10, 2))
    actual_cost = Column(Numeric(10, 2))
    labor_cost = Column(Numeric(10, 2))
    parts_cost = Column(Numeric(10, 2))
    
    # Estado del vehículo
    mileage_at_service = Column(Integer)
    engine_hours_at_service = Column(Integer)
    
    # Documentación
    work_order_number = Column(String(50))
    completion_notes = Column(Text)
    quality_rating = Column(Integer)
    customer_satisfaction = Column(Integer)
    
    # Metadata
    task_metadata = Column(Text)  # JSON como string
    attachments = Column(Text)  # JSON array como string
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    asset = relationship('Asset')
    maintenance_type = relationship('MaintenanceType')
    personnel = relationship('MaintenancePersonnel')

class MaintenancePart(Base):
    __tablename__ = 'maintenance_parts'
    id = Column(Integer, primary_key=True, index=True)
    part_number = Column(String(100), nullable=False)
    name = Column(String(200), nullable=False)
    brand_id = Column(Integer, ForeignKey('brands.id'))
    category = Column(String(100))
    description = Column(Text)
    unit_price = Column(Numeric(10, 2))
    stock_quantity = Column(Integer, default=0)
    minimum_stock = Column(Integer, default=0)
    supplier_info = Column(Text)  # JSON como string
    compatibility = Column(Text)  # JSON como string
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    brand = relationship('Brand')

class MaintenanceTaskPart(Base):
    __tablename__ = 'maintenance_task_parts'
    id = Column(Integer, primary_key=True, index=True)
    maintenance_task_id = Column(String(50), ForeignKey('maintenance_tasks.id', ondelete='CASCADE'))
    part_id = Column(Integer, ForeignKey('maintenance_parts.id'))
    quantity_used = Column(Integer, nullable=False)
    unit_cost = Column(Numeric(10, 2))
    total_cost = Column(Numeric(10, 2))
    notes = Column(Text)
    
    maintenance_task = relationship('MaintenanceTask')
    part = relationship('MaintenancePart')

class MaintenanceHistory(Base):
    __tablename__ = 'maintenance_history'
    id = Column(Integer, primary_key=True, index=True)
    asset_id = Column(Integer, ForeignKey('assets.id', ondelete='CASCADE'))
    maintenance_task_id = Column(String(50), ForeignKey('maintenance_tasks.id'))
    action_type = Column(String(50), nullable=False)
    performed_by = Column(Integer, ForeignKey('maintenance_personnel.id'))
    action_date = Column(DateTime(timezone=True), server_default=func.now())
    notes = Column(Text)
    history_metadata = Column(Text)  # JSON como string
    
    asset = relationship('Asset')
    maintenance_task = relationship('MaintenanceTask')
    personnel = relationship('MaintenancePersonnel')
