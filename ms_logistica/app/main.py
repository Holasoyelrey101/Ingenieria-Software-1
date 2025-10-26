from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response, JSONResponse
from pydantic import BaseModel
import traceback, os, logging, structlog
from prometheus_client import Counter, generate_latest, CONTENT_TYPE_LATEST  # type: ignore[reportMissingImports]

# 🔹 Importaciones internas
from .routes import router as maps_router
from .routes_routes import router as routes_router
from .logging_config import configure_logging
from .db import engine
from .models import Base

# 🔹 Nuevo: módulo de cámaras
from ms_logistica.camaras.camaras import router as camaras_router

# ------------------------------------------------------------
# CONFIGURACIÓN DE LOGGING
# ------------------------------------------------------------
configure_logging()
log = structlog.get_logger()

# ------------------------------------------------------------
# CONFIGURACIÓN DE LA APLICACIÓN
# ------------------------------------------------------------
app = FastAPI(title="ms-logistica")

# Routers principales
app.include_router(maps_router, prefix="/maps", tags=["Maps"])
app.include_router(routes_router, prefix="/routes", tags=["Routes"])
app.include_router(camaras_router, prefix="/camaras", tags=["Cámaras"])

# ------------------------------------------------------------
# BASE DE DATOS
# ------------------------------------------------------------
#try:
 #   Base.metadata.create_all(bind=engine)
#except Exception as e:
 #   log.error("Error creando las tablas", error=str(e))

# ------------------------------------------------------------
# CORS PARA DESARROLLO LOCAL
# ------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1|192\.168\.[0-9]+\.[0-9]+|10\.[0-9]+\.[0-9]+\.[0-9]+|172\.(1[6-9]|2[0-9]|3[0-1])\.[0-9]+\.[0-9]+):5173",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ------------------------------------------------------------
# MANEJO GLOBAL DE ERRORES
# ------------------------------------------------------------
@app.exception_handler(Exception)
async def global_exception_handler(request, exc: Exception):
    tb = traceback.format_exc()
    logging.error("Unhandled exception in ms-logistica: %s", str(exc))
    logging.error(tb)
    show_trace = os.environ.get("DEV", "1") == "1"
    return JSONResponse(
        status_code=500,
        content={
            "detail": "internal_server_error",
            "error": str(exc),
            "trace": tb if show_trace else None,
        },
    )

# ------------------------------------------------------------
# MÉTRICAS PROMETHEUS
# ------------------------------------------------------------
REQUESTS = Counter("ms_logistica_requests_total", "Total HTTP requests")


@app.get("/health")
async def health():
    REQUESTS.inc()
    return {"status": "ok"}


@app.get("/metrics")
async def metrics():
    data = generate_latest()
    return Response(content=data, media_type=CONTENT_TYPE_LATEST)

# ------------------------------------------------------------
# ENDPOINTS AUXILIARES
# ------------------------------------------------------------
@app.get("/")
async def root():
    """Root endpoint - útil para probar el servicio."""
    return {
        "service": "ms-logistica",
        "status": "running",
        "endpoints": [
            "/health",
            "/metrics",
            "/maps/geocode",
            "/maps/directions",
            "/maps/delivery_requests",
            "/maps/incidents",
            "/camaras/estado",  # 🔹 Nuevo endpoint visible
        ],
    }


@app.get("/favicon.ico")
async def favicon():
    # Evita 404s molestos de navegadores
    return Response(status_code=204)
