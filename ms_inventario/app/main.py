from fastapi import FastAPI
from .db import Base, engine

app = FastAPI(title="Inventario Service", version="0.1.0")

@app.on_event("startup")
def startup():
    Base.metadata.create_all(bind=engine)

@app.get("/health")
def health():
    return {"status": "ok"}

"""Versión base inicial: solo salud y estructura DB vacía.

Se eliminó el endpoint /productos para este snapshot inicial.
"""

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("ms_inventario.app.main:app", host="0.0.0.0", port=8000, reload=True)
