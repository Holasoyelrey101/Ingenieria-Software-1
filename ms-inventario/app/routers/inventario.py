from fastapi import APIRouter, Depends, HTTPException
from app.db import get_db, engine, SessionLocal
from sqlalchemy.orm import Session
from app import crud, schemas, models

router = APIRouter()

@router.get('/productos', response_model=list[schemas.ProductoOut])
def list_productos(db: Session = Depends(get_db)):
    return crud.get_productos(db)

@router.get('/inventory/{bodega_id}', response_model=list[schemas.StockItem])
def inventory_by_bodega(bodega_id: int, db: Session = Depends(get_db)):
    # Prefer enriched version including product fields; fallback to legacy if empty
    enriched = crud.get_stock_with_product_by_bodega(db, bodega_id)
    if enriched:
        return enriched
    items = crud.get_stock_by_bodega(db, bodega_id)
    return items
