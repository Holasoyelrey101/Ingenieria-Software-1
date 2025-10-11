from fastapi import APIRouter, Depends, HTTPException
from app.db import get_db
from sqlalchemy.orm import Session
from app import crud, schemas

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
