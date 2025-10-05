from sqlalchemy import Column, Integer, String, Text, DateTime, JSON
from sqlalchemy.sql import func
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
