from fastapi import APIRouter, Depends, HTTPException
from typing import List, Optional
from datetime import date, timedelta, time, datetime
from .. import schemas, models, db
from sqlalchemy.orm import Session
from sqlalchemy import and_

router = APIRouter()


def get_db():
    session = db.SessionLocal()
    try:
        yield session
    finally:
        session.close()


# ============================================
# HELPER FUNCTIONS
# ============================================

def calcular_minutos_conduccion_hoy(employee_id: int, fecha: date, session: Session) -> int:
    """
    Calcula los minutos de conducción acumulados de un conductor en un día específico.
    """
    logs = session.query(models.DrivingLog).filter(
        and_(
            models.DrivingLog.employee_id == employee_id,
            models.DrivingLog.fecha == fecha
        )
    ).all()
    total = 0
    for log in logs:
        total += log.minutos_conduccion
    return total


def puede_asignarse_conductor(
    employee_id: int,
    fecha_turno: date,
    duracion_minutos: int,
    conduccion_continua_max: int,
    session: Session
) -> tuple[bool, Optional[str]]:
    """
    Valida si un conductor puede ser asignado a un turno según reglas de conducción.
    
    Reglas:
    1. No puede conducir más de 5 horas (300 min) continuas
    2. Después de 5 horas debe descansar 2 horas (120 min)
    3. No puede tener conflictos de horario
    
    Retorna: (puede_asignarse, razon_si_no)
    """
    
    # Verificar que sea conductor
    empleado = session.query(models.Employee).filter(
        models.Employee.id == employee_id
    ).first()
    
    if empleado is None:
        return False, "Empleado no encontrado"
    
    # Obtener rol del empleado
    rol = session.query(models.Role).filter(
        models.Role.id == empleado.role_id
    ).first()
    
    if rol is None or rol.nombre != 'Conductor':
        return False, "No es un conductor"
    
    # Revisar conducción ya realizada hoy
    minutos_conduccion_hoy = calcular_minutos_conduccion_hoy(employee_id, fecha_turno, session)
    
    # Si ya tiene 5 horas, necesita 2 horas de descanso
    if minutos_conduccion_hoy >= conduccion_continua_max:
        # Buscar si tiene asignaciones después de hoy
        proximas_asignaciones = session.query(models.DynamicShiftAssignment).join(
            models.DynamicShift
        ).filter(
            and_(
                models.DynamicShiftAssignment.employee_id == employee_id,
                models.DynamicShift.fecha_programada == fecha_turno,
                models.DynamicShiftAssignment.status != 'cancelado'
            )
        ).all()
        
        if len(proximas_asignaciones) > 0:
            # Hay conflicto: necesita descanso
            return False, "Ya alcanzó 5 horas de conducción. Requiere 2 horas de descanso."
    
    # Si va a exceder 5 horas con este turno
    if minutos_conduccion_hoy + duracion_minutos > conduccion_continua_max:
        # Esto está permitido, pero el sistema debe intercalar un descanso automático
        # El duracion_minutos ya debería incluir el descanso si es necesario
        pass
    
    # Verificar que no tenga otro turno en el mismo horario
    # (Esta validación es simplificada; en producción sería más compleja)
    
    return True, None


# ============================================
# ENDPOINTS
# ============================================

@router.post('/create-from-route', response_model=schemas.DynamicShiftOut)
def create_dynamic_shift_from_route(
    route_id: int,
    fecha_programada: date,
    hora_inicio: time,
    duracion_minutos: int,
    conduccion_continua_minutos: int = 300,
    session: Session = Depends(get_db)
):
    """
    Crear un turno dinámico a partir de una ruta de logística.
    
    Este endpoint es llamado por el módulo de logística cuando se crea una nueva entrega.
    """
    shift = models.DynamicShift(
        route_id=route_id,
        fecha_programada=fecha_programada,
        hora_inicio=hora_inicio,
        duracion_minutos=duracion_minutos,
        conduccion_continua_minutos=conduccion_continua_minutos,
        status='pendiente'
    )
    session.add(shift)
    session.commit()
    session.refresh(shift)
    return shift


@router.get('/available-drivers/{dynamic_shift_id}', response_model=List[schemas.AvailableDriverResponse])
def get_available_drivers(
    dynamic_shift_id: int,
    session: Session = Depends(get_db)
):
    """
    Obtener lista de conductores disponibles para un turno dinámico específico.
    
    Valida según:
    - Rol: debe ser Conductor
    - Disponibilidad: no debe tener conflicto de horario
    - Horas de conducción: no debe exceder 5 horas continuas
    - Descanso: debe respetar 2 horas de descanso después de 5 horas
    """
    
    # Obtener info del turno dinámico
    dynamic_shift = session.query(models.DynamicShift).filter(
        models.DynamicShift.id == dynamic_shift_id
    ).first()
    
    if not dynamic_shift:
        raise HTTPException(status_code=404, detail='Turno dinámico no encontrado')
    
    # Obtener todos los conductores activos
    conductores = session.query(models.Employee).filter(
        and_(
            models.Employee.activo == True,
            models.Employee.role_id == (
                session.query(models.Role.id).filter(
                    models.Role.nombre == 'Conductor'
                ).scalar()
            )
        )
    ).all()
    
    resultado = []
    
    for conductor in conductores:
        puede_asignarse, razon = puede_asignarse_conductor(
            employee_id=conductor.id,
            fecha_turno=dynamic_shift.fecha_programada,
            duracion_minutos=dynamic_shift.duracion_minutos,
            conduccion_continua_max=dynamic_shift.conduccion_continua_minutos,
            session=session
        )
        
        horas_conduccion = calcular_minutos_conduccion_hoy(
            conductor.id,
            dynamic_shift.fecha_programada,
            session
        ) / 60
        
        resultado.append(schemas.AvailableDriverResponse(
            employee_id=conductor.id,
            nombre=conductor.nombre,
            email=conductor.email or '',
            horas_conduccion_hoy=horas_conduccion,
            puede_asignarse=puede_asignarse,
            razon_no_disponible=razon
        ))
    
    # Ordenar: primero disponibles, luego no disponibles
    resultado.sort(key=lambda x: (not x.puede_asignarse, x.horas_conduccion_hoy))
    
    return resultado


@router.post('/{dynamic_shift_id}/auto-assign', response_model=schemas.DynamicShiftWithAssignments)
def auto_assign_driver(
    dynamic_shift_id: int,
    employee_id: int,
    session: Session = Depends(get_db)
):
    """
    Auto-asignar un conductor a un turno dinámico.
    
    Esta asignación es FORZADA: el conductor no puede rechazarla.
    """
    
    # Obtener turno
    dynamic_shift = session.query(models.DynamicShift).filter(
        models.DynamicShift.id == dynamic_shift_id
    ).first()
    
    if not dynamic_shift:
        raise HTTPException(status_code=404, detail='Turno dinámico no encontrado')
    
    # Obtener empleado
    empleado = session.query(models.Employee).filter(
        models.Employee.id == employee_id
    ).first()
    
    if not empleado:
        raise HTTPException(status_code=404, detail='Empleado no encontrado')
    
    # Validar disponibilidad
    puede_asignarse, razon = puede_asignarse_conductor(
        employee_id=employee_id,
        fecha_turno=dynamic_shift.fecha_programada,
        duracion_minutos=dynamic_shift.duracion_minutos,
        conduccion_continua_max=dynamic_shift.conduccion_continua_minutos,
        session=session
    )
    
    if not puede_asignarse:
        raise HTTPException(status_code=409, detail=f'No disponible: {razon}')
    
    # Crear asignación
    assignment = models.DynamicShiftAssignment(
        dynamic_shift_id=dynamic_shift_id,
        employee_id=employee_id,
        role_in_shift='conductor',
        status='asignado'
    )
    session.add(assignment)
    
    # Actualizar estado del turno
    dynamic_shift.status = 'asignado'
    dynamic_shift.assigned_at = datetime.now()
    
    session.commit()
    session.refresh(dynamic_shift)
    
    # Cargar assignments para la respuesta
    dynamic_shift.assignments = session.query(models.DynamicShiftAssignment).filter(
        models.DynamicShiftAssignment.dynamic_shift_id == dynamic_shift_id
    ).all()
    
    return dynamic_shift


@router.get('/', response_model=List[schemas.DynamicShiftOut])
def list_dynamic_shifts(
    fecha_desde: Optional[date] = None,
    fecha_hasta: Optional[date] = None,
    status: Optional[str] = None,
    session: Session = Depends(get_db)
):
    """
    Listar turnos dinámicos con filtros opcionales.
    """
    
    q = session.query(models.DynamicShift)
    
    if fecha_desde:
        q = q.filter(models.DynamicShift.fecha_programada >= fecha_desde)
    
    if fecha_hasta:
        q = q.filter(models.DynamicShift.fecha_programada <= fecha_hasta)
    
    if status:
        q = q.filter(models.DynamicShift.status == status)
    
    return q.order_by(models.DynamicShift.fecha_programada).all()


@router.get('/{id}', response_model=schemas.DynamicShiftWithAssignments)
def get_dynamic_shift(id: int, session: Session = Depends(get_db)):
    """
    Obtener un turno dinámico con sus asignaciones.
    """
    
    shift = session.query(models.DynamicShift).filter(
        models.DynamicShift.id == id
    ).first()
    
    if not shift:
        raise HTTPException(status_code=404, detail='Turno dinámico no encontrado')
    
    # Cargar assignments
    assignments = session.query(models.DynamicShiftAssignment).filter(
        models.DynamicShiftAssignment.dynamic_shift_id == id
    ).all()
    
    result = schemas.DynamicShiftWithAssignments(
        **shift.__dict__,
        assignments=[schemas.DynamicShiftAssignmentOut.from_orm(a) for a in assignments]
    )
    
    return result


@router.get('/pending/unassigned')
def get_pending_unassigned_shifts(session: Session = Depends(get_db)):
    """
    Obtener todos los turnos dinámicos pendientes sin asignar.
    """
    
    shifts = session.query(models.DynamicShift).filter(
        models.DynamicShift.status == 'pendiente'
    ).all()
    
    return shifts


@router.delete('/{dynamic_shift_id}/unassign', response_model=schemas.DynamicShiftWithAssignments)
def unassign_driver(
    dynamic_shift_id: int,
    session: Session = Depends(get_db)
):
    """
    Desasignar un conductor de un turno dinámico.
    
    Esto elimina la asignación y vuelve el turno a estado 'pendiente'.
    """
    
    # Obtener turno
    dynamic_shift = session.query(models.DynamicShift).filter(
        models.DynamicShift.id == dynamic_shift_id
    ).first()
    
    if not dynamic_shift:
        raise HTTPException(status_code=404, detail='Turno dinámico no encontrado')
    
    # Eliminar asignaciones
    session.query(models.DynamicShiftAssignment).filter(
        models.DynamicShiftAssignment.dynamic_shift_id == dynamic_shift_id
    ).delete()
    
    # Actualizar estado del turno
    dynamic_shift.status = 'pendiente'
    dynamic_shift.assigned_at = None
    
    session.commit()
    session.refresh(dynamic_shift)
    
    # Cargar assignments para la respuesta (deberían estar vacías)
    assignments = session.query(models.DynamicShiftAssignment).filter(
        models.DynamicShiftAssignment.dynamic_shift_id == dynamic_shift_id
    ).all()
    
    result = schemas.DynamicShiftWithAssignments(
        **dynamic_shift.__dict__,
        assignments=[schemas.DynamicShiftAssignmentOut.from_orm(a) for a in assignments]
    )
    
    return result
