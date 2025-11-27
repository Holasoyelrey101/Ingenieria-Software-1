from fastapi import APIRouter, Depends, HTTPException
from app.db import get_db
from sqlalchemy.orm import Session
from datetime import datetime
from app import crud, schemas
from app.models import Movimiento

router = APIRouter()

@router.post('/movements')
def post_movement(payload: schemas.MovementIn, db: Session = Depends(get_db)):
    # tipo: IN adds, OUT subtracts (expecting positive cantidad)
    if payload.tipo not in ('IN','OUT','TRANSFER'):
        raise HTTPException(status_code=400, detail='tipo must be IN|OUT|TRANSFER')
    delta = payload.cantidad if payload.tipo=='IN' else -payload.cantidad
    # upsert stock (simple approach)
    stock = crud.upsert_stock(db, payload.producto_id, payload.bodega_id, delta)
    mov = crud.insert_movimiento(db, payload.producto_id, None, payload.bodega_id, payload.cantidad)
    # evaluate threshold and create alert if needed
    alert = crud.check_and_create_alert(db, payload.producto_id, payload.bodega_id)
    return {'ok': True, 'stock': stock.cantidad, 'alert': alert.id if alert else None}


@router.get('/movements/count')
def count_movements(desde: str | None = None, hasta: str | None = None, db: Session = Depends(get_db)):
    """Cantidad de movimientos registrados en un rango (fecha)."""
    q = db.query(Movimiento)
    def parse_dt(s: str):
        try:
            return datetime.fromisoformat(s) if len(s) > 10 else datetime.fromisoformat(s + 'T00:00:00')
        except Exception:
            return None
    dts = parse_dt(desde) if desde else None
    dte = parse_dt(hasta) if hasta else None
    if dts:
        q = q.filter(Movimiento.fecha >= dts)
    if dte:
        q = q.filter(Movimiento.fecha <= dte)
    return {"count": q.count()}
