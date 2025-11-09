from fastapi import FastAPI
from app.routers import inventario, movimientos, alerts, export, maintenance
from fastapi.middleware.cors import CORSMiddleware
from app.db import engine, Base
from app import models
import os
import logging

# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="ms-inventario")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:8080", "http://127.0.0.1:8080"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Crear todas las tablas al iniciar la aplicación
@app.on_event("startup")
async def startup_event():
    try:
        logger.info("Creando tablas de base de datos...")
        Base.metadata.create_all(bind=engine)
        logger.info("✅ Tablas creadas exitosamente")
    except Exception as e:
        logger.error(f"❌ Error creando tablas: {e}")
        # Intentar de nuevo después de un momento
        import time
        time.sleep(2)
        try:
            Base.metadata.create_all(bind=engine)
            logger.info("✅ Tablas creadas en segundo intento")
        except Exception as e2:
            logger.error(f"❌ Error persistente: {e2}")

@app.get('/health')
def health():
    return {'status':'ok'}

app.include_router(inventario.router, prefix="", tags=["inventario"]) 
app.include_router(movimientos.router, prefix="", tags=["movimientos"]) 
app.include_router(alerts.router, prefix="", tags=["alerts"]) 
app.include_router(export.router, prefix="/export", tags=["export"])  # HU12
app.include_router(maintenance.router, prefix="", tags=["maintenance"])  # HU7
