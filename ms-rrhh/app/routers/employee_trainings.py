from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from .. import schemas, models, db

router = APIRouter()


def get_db():
    session = db.SessionLocal()
    try:
        yield session
    finally:
        session.close()

@router.post("/employee-trainings", response_model=schemas.EmployeeTrainingOut, status_code=201)
def create_employee_training(payload: schemas.EmployeeTrainingCreate, session: Session = Depends(get_db)):
    """Assign a training to an employee"""
    emp_training = models.EmployeeTraining(**payload.dict())
    session.add(emp_training)
    session.commit()
    session.refresh(emp_training)
    return emp_training

@router.get("/employee-trainings", response_model=list[schemas.EmployeeTrainingOut])
def list_employee_trainings(employee_id: int = None, training_id: int = None, session: Session = Depends(get_db)):
    """List employee trainings with optional filters"""
    query = session.query(models.EmployeeTraining)
    
    if employee_id:
        query = query.filter(models.EmployeeTraining.employee_id == employee_id)
    if training_id:
        query = query.filter(models.EmployeeTraining.training_id == training_id)
    
    return query.all()

@router.get("/employee-trainings/{emp_training_id}", response_model=schemas.EmployeeTrainingOut)
def get_employee_training(emp_training_id: int, session: Session = Depends(get_db)):
    """Get a specific employee training record"""
    emp_training = session.get(models.EmployeeTraining, emp_training_id)
    if not emp_training:
        raise HTTPException(status_code=404, detail="Employee training record not found")
    return emp_training

@router.get("/employees/{employee_id}/trainings", response_model=list[schemas.EmployeeTrainingOut])
def get_employee_trainings(employee_id: int, session: Session = Depends(get_db)):
    """Get all trainings for a specific employee"""
    # Verify employee exists
    employee = session.get(models.Employee, employee_id)
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    trainings = session.query(models.EmployeeTraining).filter(
        models.EmployeeTraining.employee_id == employee_id
    ).all()
    return trainings

@router.put("/employee-trainings/{emp_training_id}", response_model=schemas.EmployeeTrainingOut)
def update_employee_training(emp_training_id: int, payload: schemas.EmployeeTrainingCreate, session: Session = Depends(get_db)):
    """Update an employee training record"""
    emp_training = session.get(models.EmployeeTraining, emp_training_id)
    if not emp_training:
        raise HTTPException(status_code=404, detail="Employee training record not found")
    
    for key, value in payload.dict().items():
        setattr(emp_training, key, value)
    
    session.commit()
    session.refresh(emp_training)
    return emp_training

@router.delete("/employee-trainings/{emp_training_id}", status_code=204)
def delete_employee_training(emp_training_id: int, session: Session = Depends(get_db)):
    """Delete an employee training record"""
    emp_training = session.get(models.EmployeeTraining, emp_training_id)
    if not emp_training:
        raise HTTPException(status_code=404, detail="Employee training record not found")
    
    session.delete(emp_training)
    session.commit()
