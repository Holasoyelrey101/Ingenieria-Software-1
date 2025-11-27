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

@router.post("", response_model=schemas.TrainingOut, status_code=201)
def create_training(payload: schemas.TrainingCreate, session: Session = Depends(get_db)):
    """Create a new training"""
    training = models.Training(**payload.dict())
    session.add(training)
    session.commit()
    session.refresh(training)
    return training

@router.get("", response_model=list[schemas.TrainingOut])
def list_trainings(session: Session = Depends(get_db)):
    """List all trainings"""
    trainings = session.query(models.Training).all()
    return trainings

@router.get("/{training_id}", response_model=schemas.TrainingOut)
def get_training(training_id: int, session: Session = Depends(get_db)):
    """Get a specific training by ID"""
    training = session.get(models.Training, training_id)
    if not training:
        raise HTTPException(status_code=404, detail="Training not found")
    return training

@router.put("/{training_id}", response_model=schemas.TrainingOut)
def update_training(training_id: int, payload: schemas.TrainingCreate, session: Session = Depends(get_db)):
    """Update a training"""
    training = session.get(models.Training, training_id)
    if not training:
        raise HTTPException(status_code=404, detail="Training not found")
    
    for key, value in payload.dict().items():
        setattr(training, key, value)
    
    session.commit()
    session.refresh(training)
    return training

@router.delete("/{training_id}", status_code=204)
def delete_training(training_id: int, session: Session = Depends(get_db)):
    """Delete a training"""
    training = session.get(models.Training, training_id)
    if not training:
        raise HTTPException(status_code=404, detail="Training not found")
    
    session.delete(training)
    session.commit()
