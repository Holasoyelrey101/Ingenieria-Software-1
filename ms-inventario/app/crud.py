from sqlalchemy import select, func
from app.models import Producto, Stock, Movimiento, Alerta, UmbralStock
from sqlalchemy.orm import Session

def get_productos(db: Session):
    return db.execute(select(Producto)).scalars().all()

def get_stock_by_bodega(db: Session, bodega_id: int):
    stmt = select(Stock).where(Stock.bodega_id==bodega_id)
    return db.execute(stmt).scalars().all()

def get_stock_with_product_by_bodega(db: Session, bodega_id: int):
    """Return stock rows enriched with product sku and nombre for a bodega."""
    stmt = (
        select(Stock, Producto.sku, Producto.nombre)
        .join(Producto, Producto.id == Stock.producto_id)
        .where(Stock.bodega_id == bodega_id)
    )
    rows = db.execute(stmt).all()
    result = []
    for stock, sku, nombre in rows:
        result.append({
            "producto_id": stock.producto_id,
            "sku": sku,
            "nombre": nombre,
            "cantidad": stock.cantidad
        })
    return result

def upsert_stock(db: Session, producto_id:int, bodega_id:int, cantidad:int):
    existing = db.execute(select(Stock).where(Stock.producto_id==producto_id, Stock.bodega_id==bodega_id)).scalars().first()
    if existing:
        existing.cantidad = existing.cantidad + cantidad
        db.add(existing)
        db.commit()
        db.refresh(existing)
        return existing
    else:
        new = Stock(producto_id=producto_id, bodega_id=bodega_id, cantidad=cantidad)
        db.add(new)
        db.commit()
        db.refresh(new)
        return new

def insert_movimiento(db: Session, producto_id:int, origen_id:int, destino_id:int, cantidad:int):
    m = Movimiento(producto_id=producto_id, origen_id=origen_id, destino_id=destino_id, cantidad=cantidad)
    db.add(m)
    db.commit()
    db.refresh(m)
    return m

def check_and_create_alert(db: Session, producto_id:int, bodega_id:int):
    # simplified precedence: product+bodega -> product global -> default (min=5)
    threshold = db.execute(select(UmbralStock).where(UmbralStock.producto_id==producto_id, UmbralStock.bodega_id==bodega_id)).scalars().first()
    if not threshold:
        threshold = db.execute(select(UmbralStock).where(UmbralStock.producto_id==producto_id, UmbralStock.bodega_id==None)).scalars().first()
    if threshold:
        stock = db.execute(select(Stock).where(Stock.producto_id==producto_id, Stock.bodega_id==bodega_id)).scalars().first()
        current = stock.cantidad if stock else 0
        if current < threshold.minimo:
            a = Alerta(producto_id=producto_id, bodega_id=bodega_id, tipo='STOCK_LOW', mensaje=f'Stock bajo: {current} < {threshold.minimo}')
            db.add(a)
            db.commit()
            db.refresh(a)
            return a
    return None
