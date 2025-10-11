from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Routers
from .routes import router as maps_router
from .routes_routes import router as routes_router

import structlog  # type: ignore[reportMissingImports]
from prometheus_client import Counter, generate_latest, CONTENT_TYPE_LATEST  # type: ignore[reportMissingImports]
from fastapi.responses import Response
from .logging_config import configure_logging

configure_logging()

log = structlog.get_logger()

app = FastAPI(title="ms-logistica")

# Prefijos
app.include_router(maps_router, prefix="/maps", tags=["maps"])
app.include_router(routes_router, prefix="/routes", tags=["routes"])

# CORS para desarrollo local (Vite)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_origin_regex=r"https?://(localhost|127\\.0\\.1|192\\.168\\.[0-9]+\\.[0-9]+|10\\.[0-9]+\\.[0-9]+\\.[0-9]+|172\\.(1[6-9]|2[0-9]|3[0-1])\\.[0-9]+\\.[0-9]+):5173",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Global exception handler for dev visibility
from fastapi.responses import JSONResponse
import traceback, os, logging


@app.exception_handler(Exception)
async def global_exception_handler(request, exc: Exception):
    tb = traceback.format_exc()
    logging.error("Unhandled exception in ms-logistica: %s", str(exc))
    logging.error(tb)
    show_trace = os.environ.get("DEV", "1") == "1"
    return JSONResponse(status_code=500, content={"detail": "internal_server_error", "error": str(exc), "trace": tb if show_trace else None})

# Prometheus metrics
REQUESTS = Counter("ms_logistica_requests_total", "Total HTTP requests")


@app.get("/health")
async def health():
    REQUESTS.inc()
    return {"status": "ok"}


@app.get("/metrics")
async def metrics():
    data = generate_latest()
    return Response(content=data, media_type=CONTENT_TYPE_LATEST)


@app.get("/")
async def root():
    """Root endpoint - useful for browsers hitting the service."""
    return {
        "service": "ms-logistica",
        "status": "running",
        "endpoints": [
            "/health",
            "/metrics",
            "/maps/geocode",
            "/maps/directions",
            "/routes/optimize",
            "/routes/{id}"
        ]
    }


@app.get("/favicon.ico")
async def favicon():
    # Return empty 204 to avoid noisy 404s from browsers
    return Response(status_code=204)
