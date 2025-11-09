from pydantic import BaseModel, EmailStr, conint
from typing import Optional, List
from datetime import date, time, datetime

class EmployeeCreate(BaseModel):
    nombre: str
    email: Optional[EmailStr]
    rut: Optional[str]

class EmployeeOut(EmployeeCreate):
    id: int
    activo: Optional[bool]

    class Config:
        from_attributes = True

class ShiftCreate(BaseModel):
    tipo: str  # 'Mañana', 'Tarde', 'Noche'
    start_time: time
    end_time: time
    timezone: str = 'America/Santiago'

class ShiftOut(ShiftCreate):
    id: int

    class Config:
        from_attributes = True

class AssignmentCreate(BaseModel):
    employee_id: int
    shift_id: int
    date: date
    notes: Optional[str] = None

class AssignmentOut(AssignmentCreate):
    id: int

    class Config:
        from_attributes = True

class TrainingCreate(BaseModel):
    title: str
    topic: Optional[str] = None
    required: Optional[bool] = False

class TrainingOut(TrainingCreate):
    id: int

    class Config:
        from_attributes = True

class EmployeeTrainingCreate(BaseModel):
    employee_id: int
    training_id: int
    date: date
    instructor: Optional[str] = None
    status: Optional[str] = 'COMPLETED'
    certificate_url: Optional[str] = None
    notes: Optional[str] = None

class EmployeeTrainingOut(EmployeeTrainingCreate):
    id: int

    class Config:
        from_attributes = True

# ============================================
# ROLES AND CONTRACT TYPES
# ============================================
class RoleOut(BaseModel):
    id: int
    nombre: str
    descripcion: Optional[str]
    is_dynamic_shifts: bool
    requires_pairing: bool

    class Config:
        from_attributes = True

class ContractTypeOut(BaseModel):
    id: int
    nombre: str
    descripcion: Optional[str]

    class Config:
        from_attributes = True

# ============================================
# DYNAMIC SHIFTS
# ============================================
class DynamicShiftCreate(BaseModel):
    route_id: int
    fecha_programada: date
    hora_inicio: time
    duracion_minutos: int
    conduccion_continua_minutos: int = 300  # 5 horas

class DynamicShiftOut(DynamicShiftCreate):
    id: int
    status: str
    created_at: datetime
    assigned_at: Optional[datetime]
    completed_at: Optional[datetime]

    class Config:
        from_attributes = True

class DynamicShiftAssignmentCreate(BaseModel):
    dynamic_shift_id: int
    employee_id: int
    role_in_shift: str  # 'conductor', 'asistente', 'custodia'

class DynamicShiftAssignmentOut(DynamicShiftAssignmentCreate):
    id: int
    assigned_at: datetime
    started_at: Optional[datetime]
    completed_at: Optional[datetime]
    status: str

    class Config:
        from_attributes = True

class AvailableDriverResponse(BaseModel):
    employee_id: int
    nombre: str
    email: str
    horas_conduccion_hoy: float
    puede_asignarse: bool
    razon_no_disponible: Optional[str]

class DynamicShiftWithAssignments(DynamicShiftOut):
    assignments: List[DynamicShiftAssignmentOut] = []
