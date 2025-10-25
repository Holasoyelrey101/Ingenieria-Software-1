from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
from .. import schemas, models, db
from sqlalchemy.orm import Session
from datetime import date, timedelta

router = APIRouter()


def get_db():
    session = db.SessionLocal()
    try:
        yield session
    finally:
        session.close()

@router.post('/', response_model=schemas.AssignmentOut)
def create_assignment(payload: schemas.AssignmentCreate, session: Session = Depends(get_db)):
    # Simple overlap check: ensure same employee/date doesn't already have this shift
    exists = session.query(models.ShiftAssignment).filter(
        models.ShiftAssignment.employee_id == payload.employee_id,
        models.ShiftAssignment.date == payload.date,
    ).first()
    if exists:
        raise HTTPException(status_code=409, detail='Employee already has an assignment for this date')
    a = models.ShiftAssignment(**payload.dict())
    session.add(a)
    session.commit()
    session.refresh(a)
    return a

@router.get('/', response_model=List[schemas.AssignmentOut])
def list_assignments(employee_id: Optional[int] = None, _from: Optional[date] = None, to: Optional[date] = None, session: Session = Depends(get_db)):
    q = session.query(models.ShiftAssignment)
    if employee_id:
        q = q.filter(models.ShiftAssignment.employee_id == employee_id)
    if _from:
        q = q.filter(models.ShiftAssignment.date >= _from)
    if to:
        q = q.filter(models.ShiftAssignment.date <= to)
    return q.all()


# Suggestions endpoint: Shows unassigned employees and uncovered shifts
@router.get('/suggestions/weekly', response_model=dict)
def get_weekly_suggestions(session: Session = Depends(get_db)):
    """
    Returns:
    {
        "unassigned_employees": [
            {"id": 1, "nombre": "Juan", "assignments_this_week": 0}
        ],
        "uncovered_shifts": [
            {"date": "2025-10-27", "shift_tipo": "Mañana", "assigned_count": 1, "total_needed": 3}
        ],
        "week_start": "2025-10-27",
        "week_end": "2025-11-02"
    }
    """
    # Calculate week boundaries (Monday-Sunday)
    today = date.today()
    monday = today - timedelta(days=today.weekday())
    sunday = monday + timedelta(days=6)
    
    # Get all employees
    all_employees = session.query(models.Employee).filter(models.Employee.activo == True).all()
    
    # Get all shifts
    all_shifts = session.query(models.Shift).all()
    
    # Get all assignments for this week
    week_assignments = session.query(models.ShiftAssignment).filter(
        models.ShiftAssignment.date >= monday,
        models.ShiftAssignment.date <= sunday
    ).all()
    
    # Find employees with no assignments this week
    assigned_employee_ids = {a.employee_id for a in week_assignments}
    unassigned_employees = []
    
    for emp in all_employees:
        if emp.id not in assigned_employee_ids:
            unassigned_employees.append({
                "id": emp.id,
                "nombre": emp.nombre,
                "email": emp.email,
                "assignments_this_week": 0
            })
        else:
            # Count assignments per employee
            emp_count = len([a for a in week_assignments if a.employee_id == emp.id])
            if emp_count < 3:  # Less than 3 shifts (ideally one per shift type)
                unassigned_employees.append({
                    "id": emp.id,
                    "nombre": emp.nombre,
                    "email": emp.email,
                    "assignments_this_week": emp_count
                })
    
    # Find uncovered shifts (those with NO employees assigned)
    uncovered_shifts = []
    WEEKDAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
    
    for day_offset in range(7):
        current_date = monday + timedelta(days=day_offset)
        
        for shift in all_shifts:
            # Count how many employees are assigned this shift/date
            assigned_count = len([
                a for a in week_assignments
                if a.date == current_date and a.shift_id == shift.id
            ])
            
            # Only flag if NO employees are assigned
            if assigned_count == 0:
                uncovered_shifts.append({
                    "date": current_date.isoformat(),
                    "weekday": WEEKDAYS[day_offset],
                    "shift_tipo": shift.tipo,
                    "shift_id": shift.id,
                    "start_time": shift.start_time,
                    "end_time": shift.end_time,
                    "assigned_count": assigned_count,
                    "has_coverage": False
                })
    
    return {
        "unassigned_employees": unassigned_employees,
        "uncovered_shifts": uncovered_shifts,
        "week_start": monday.isoformat(),
        "week_end": sunday.isoformat(),
        "total_employees": len(all_employees),
        "total_shifts": len(all_shifts),
        "total_assignments_this_week": len(week_assignments)
    }


@router.get('/{id}', response_model=schemas.AssignmentOut)
def get_assignment(id: int, session: Session = Depends(get_db)):
    a = session.get(models.ShiftAssignment, id)
    if not a:
        raise HTTPException(status_code=404, detail='Assignment not found')
    return a


@router.delete('/{id}', status_code=status.HTTP_204_NO_CONTENT)
def delete_assignment(id: int, session: Session = Depends(get_db)):
    a = session.get(models.ShiftAssignment, id)
    if not a:
        raise HTTPException(status_code=404, detail='Assignment not found')
    session.delete(a)
    session.commit()
    return None

