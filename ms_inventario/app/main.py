from fastapi import FastAPI, Depends
from sqlalchemy.orm import Session
from .db import Base, engine, get_db
from . import models  # noqa

app = FastAPI(title="Inventario Service", version="0.2.0")

@app.on_event("startup")
def startup():
    Base.metadata.create_all(bind=engine)

@app.get("/health")
def health():
    return {"status": "ok"}

@app.get("/productos")
def get_productos(db: Session = Depends(get_db)):
    return db.query(models.Producto).all()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("ms_inventario.app.main:app", host="0.0.0.0", port=8000, reload=True)
