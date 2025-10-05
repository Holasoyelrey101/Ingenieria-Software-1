from fastapi import APIRouter, Depends, HTTPException
from app.db import get_db
from sqlalchemy.orm import Session
from app.models import Alerta
from app.schemas import AlertOut

router = APIRouter()

@router.get('/alerts', response_model=list[AlertOut])
def list_alerts(db: Session = Depends(get_db)):
    alerts = db.query(Alerta).filter(Alerta.leida==False).all()
    return alerts

@router.patch('/alerts/{id}/ack')
def ack_alert(id: int, db: Session = Depends(get_db)):
    alert = db.query(Alerta).filter(Alerta.id==id).first()
    if not alert:
        raise HTTPException(status_code=404, detail='alert not found')
    alert.leida = True
    db.add(alert)
    db.commit()
    return {'ok': True}
