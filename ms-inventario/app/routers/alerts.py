from fastapi import APIRouter, Depends, HTTPException
from datetime import datetime
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
    # Pylance/SQLAlchemy typing: attribute is instrumented; runtime is bool
    alert.leida = True  # type: ignore[assignment]
    db.add(alert)
    db.commit()
    return {'ok': True}


@router.get('/alerts/count')
def count_alerts(desde: str | None = None, hasta: str | None = None, db: Session = Depends(get_db)):
    """Cantidad de alertas generadas en un rango (fecha)."""
    q = db.query(Alerta)
    def parse_dt(s: str):
        try:
            return datetime.fromisoformat(s) if len(s) > 10 else datetime.fromisoformat(s + 'T00:00:00')
        except Exception:
            return None
    dts = parse_dt(desde) if desde else None
    dte = parse_dt(hasta) if hasta else None
    if dts:
        q = q.filter(Alerta.fecha >= dts)
    if dte:
        q = q.filter(Alerta.fecha <= dte)
    return {"count": q.count()}
