from fastapi import APIRouter, Depends, HTTPException
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


@router.get('/', response_model=List[schemas.ShiftOut])
def list_shifts(session: Session = Depends(get_db)):
    """Get all predefined shifts. Shifts are not user-configurable for a logistics company."""
    return session.query(models.Shift).all()


@router.get('/{id}', response_model=schemas.ShiftOut)
def get_shift(id: int, session: Session = Depends(get_db)):
    """Get a specific shift by ID."""
    s = session.get(models.Shift, id)
    if not s:
        raise HTTPException(status_code=404, detail='Shift not found')
    return s
