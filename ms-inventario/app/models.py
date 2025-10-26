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
