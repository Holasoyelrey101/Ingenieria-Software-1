from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from .. import schemas, models, db
from sqlalchemy.orm import Session

router = APIRouter()


def get_db():
    session = db.SessionLocal()
    try:
        yield session
    finally:
        session.close()

@router.post('/', response_model=schemas.EmployeeOut)
def create_employee(payload: schemas.EmployeeCreate, session: Session = Depends(get_db)):
    emp = models.Employee(**payload.dict())
    session.add(emp)
    session.commit()
    session.refresh(emp)
    return emp

@router.get('/', response_model=List[schemas.EmployeeOut])
def list_employees(session: Session = Depends(get_db)):
    return session.query(models.Employee).all()

@router.get('/{id}', response_model=schemas.EmployeeOut)
def get_employee(id: int, session: Session = Depends(get_db)):
    emp = session.get(models.Employee, id)
    if not emp:
        raise HTTPException(status_code=404, detail='Employee not found')
    return emp


@router.put('/{id}', response_model=schemas.EmployeeOut)
def update_employee(id: int, payload: schemas.EmployeeCreate, session: Session = Depends(get_db)):
    emp = session.get(models.Employee, id)
    if not emp:
        raise HTTPException(status_code=404, detail='Employee not found')
    for k, v in payload.dict(exclude_unset=True).items():
        setattr(emp, k, v)
    session.add(emp)
    session.commit()
    session.refresh(emp)
    return emp


@router.delete('/{id}', status_code=status.HTTP_204_NO_CONTENT)
def delete_employee(id: int, session: Session = Depends(get_db)):
    emp = session.get(models.Employee, id)
    if not emp:
        raise HTTPException(status_code=404, detail='Employee not found')
    session.delete(emp)
    session.commit()
    return None
