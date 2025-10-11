from sqlalchemy import Column, Integer, String, Text, DateTime
from sqlalchemy.sql import func
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
