from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class VehicleCameraBase(BaseModel):
    vehicle_id: int
    camera_id: str
    camera_name: Optional[str] = None
    position: Optional[str] = None
    active: bool = True


class VehicleCameraCreate(BaseModel):
    camera_id: str
    camera_name: Optional[str] = None
    position: Optional[str] = None
    active: bool = True


class VehicleCameraUpdate(BaseModel):
    camera_name: Optional[str] = None
    position: Optional[str] = None
    active: Optional[bool] = None


class VehicleCameraResponse(VehicleCameraBase):
    id: int
    stream_url: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

