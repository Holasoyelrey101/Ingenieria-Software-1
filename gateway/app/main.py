from fastapi import FastAPI, Depends, HTTPException, Security, Request
from fastapi.security import OAuth2PasswordRequestForm, HTTPAuthorizationCredentials, HTTPBearer
from fastapi.responses import JSONResponse, Response
from fastapi.middleware.cors import CORSMiddleware
from prometheus_client import Counter, generate_latest, CONTENT_TYPE_LATEST
import httpx
import os
import json
import traceback
import logging
from sqlalchemy.orm import Session
from .auth import (
    create_access_token,
    decode_token,
    verify_password,
    generate_totp,
    verify_totp,
)
from .db import SessionLocal, engine
from . import models

# ------------------------------------------------------
# CONFIGURACIÓN INICIAL
# ------------------------------------------------------

app = FastAPI(title="Gateway LuxChile ERP")

# Configuración de CORS (para entorno local/frontend Vite)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Métricas Prometheus
REQUESTS = Counter("gateway_requests_total", "Total gateway HTTP requests")

security = HTTPBearer()

# ------------------------------------------------------
# MANEJO GLOBAL DE ERRORES
# ------------------------------------------------------

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    tb = traceback.format_exc()
    logging.error("Unhandled exception: %s", str(exc))
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

# ------------------------------------------------------
# AUTENTICACIÓN Y SEGURIDAD
# ------------------------------------------------------

def get_current_user(token: HTTPAuthorizationCredentials = Security(security)):
    try:
        payload = decode_token(token.credentials)
        return payload
    except Exception as e:
        raise HTTPException(status_code=401, detail=str(e))


def rbac(required_roles: list):
    def checker(user=Depends(get_current_user)):
        roles = user.get("roles", [])
        if not any(r in roles for r in required_roles):
            raise HTTPException(status_code=403, detail="forbidden")
        return user
    return checker


@app.post("/auth/token")
async def token(form_data: OAuth2PasswordRequestForm = Depends()):
    # Ejemplo simple; en producción se valida contra la base de datos
    if form_data.username == "admin" and form_data.password == "admin":
        token = create_access_token(subject=form_data.username, extra={"roles": ["admin"]})
        return {"access_token": token, "token_type": "bearer"}
    raise HTTPException(status_code=400, detail="Incorrect username or password")


@app.post("/auth/totp/setup")
async def totp_setup(user=Depends(get_current_user)):
    return generate_totp()


@app.post("/auth/totp/verify")
async def totp_verify(code: str, user=Depends(get_current_user)):
    secret = user.get("totp_secret")
    if not secret:
        raise HTTPException(status_code=400, detail="no totp configured")
    ok = verify_totp(secret, code)
    return {"ok": ok}

# ------------------------------------------------------
# MÉTRICAS Y SALUD DEL SERVICIO
# ------------------------------------------------------

@app.get("/health")
async def health():
    REQUESTS.inc()
    return {"status": "ok"}


@app.get("/metrics")
async def metrics():
    data = generate_latest()
    return Response(content=data, media_type=CONTENT_TYPE_LATEST)

# ------------------------------------------------------
# BASE DE DATOS
# ------------------------------------------------------

try:
    models.Base.metadata.create_all(bind=engine)
except Exception as e:
    logging.error("Could not create DB tables at startup: %s", str(e))
    logging.debug("DB create_all exception", exc_info=True)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# ------------------------------------------------------
# PROXIES HACIA MS-LOGISTICA
# ------------------------------------------------------

@app.post("/maps/geocode")
async def maps_geocode(payload: dict):
    """Redirige solicitudes de geocodificación al microservicio de logística"""
    ms_url = os.environ.get("MS_LOGISTICA_URL", "http://127.0.0.1:18001/maps/geocode")
    try:
        async with httpx.AsyncClient() as client:
            r = await client.post(ms_url, json=payload, timeout=20)
        content = r.json() if r.headers.get("content-type", "").startswith("application/json") else {"raw_text": r.text}
        return JSONResponse(status_code=r.status_code, content=content)
    except httpx.RequestError as e:
        logging.error("ms-logistica geocode request failed: %s", str(e))
        return JSONResponse(status_code=502, content={"error": "ms_logistica_unreachable", "detail": str(e)})
    except Exception as e:
        logging.exception("Unexpected error when contacting ms-logistica geocode")
        return JSONResponse(status_code=500, content={"error": "internal_proxy_error", "detail": str(e)})


@app.post("/maps/directions")
async def maps_directions(payload: dict, request: Request, db: Session = Depends(get_db)):
    """Redirige solicitudes de direcciones (rutas) al microservicio de logística"""
    ms_url = os.environ.get("MS_LOGISTICA_URL", "http://127.0.0.1:18001/maps/directions")
    try:
        async with httpx.AsyncClient() as client:
            r = await client.post(ms_url, json=payload, timeout=30)
    except httpx.RequestError as e:
        logging.error("ms-logistica directions request failed: %s", str(e))
        # Registro local del fallo (best effort)
        try:
            rr = models.RouteRequest(
                origin=json.dumps(payload.get("origin"), ensure_ascii=False),
                destination=json.dumps(payload.get("destination"), ensure_ascii=False),
                payload=json.dumps(payload, ensure_ascii=False),
                response=str(e),
                status="error:ms_unreachable",
            )
            db.add(rr)
            db.commit()
        except Exception:
            logging.debug("Failed to persist failed route request", exc_info=True)
        return JSONResponse(status_code=502, content={"error": "ms_logistica_unreachable", "detail": str(e)})

    except Exception as e:
        logging.exception("Unexpected error contacting ms-logistica directions")
        return JSONResponse(status_code=500, content={"error": "internal_proxy_error", "detail": str(e)})

    # Procesar respuesta
    body_text = r.text
    origin = payload.get("origin")
    destination = payload.get("destination")

    # Persistir la solicitud (best-effort)
    try:
        rr = models.RouteRequest(
            origin=origin,
            destination=destination,
            payload=json.dumps(payload, ensure_ascii=False),
            response=body_text,
            status="ok" if r.status_code == 200 else f"error:{r.status_code}",
        )
        db.add(rr)
        db.commit()
        db.refresh(rr)
    except Exception:
        logging.debug("warning: failed to persist route request", exc_info=True)

    try:
        content = r.json()
    except Exception:
        content = {"raw_text": body_text}
    return JSONResponse(status_code=r.status_code, content=content)

# ------------------------------------------------------
# ADMINISTRACIÓN DE RUTAS REGISTRADAS
# ------------------------------------------------------

@app.get("/admin/route-requests")
def list_route_requests(limit: int = 100, db: Session = Depends(get_db)):
    items = db.query(models.RouteRequest).order_by(models.RouteRequest.created_at.desc()).limit(limit).all()
    return [
        {
            "id": i.id,
            "origin": i.origin,
            "destination": i.destination,
            "status": i.status,
            "created_at": i.created_at.isoformat() if i.created_at else None,
        }
        for i in items
    ]


@app.get("/admin/route-requests/{request_id}")
def get_route_request(request_id: int, db: Session = Depends(get_db)):
    item = db.query(models.RouteRequest).filter(models.RouteRequest.id == request_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="not found")
    return {
        "id": item.id,
        "origin": item.origin,
        "destination": item.destination,
        "payload": item.payload,
        "response": item.response,
        "status": item.status,
        "created_at": item.created_at.isoformat() if item.created_at else None,
    }

# ------------------------------------------------------
# IMPORTACIÓN DE RUTAS ADICIONALES (HU11, HU12, ETC.)
# ------------------------------------------------------

try:
    from . import reportes  # HU11 y HU12
    app.include_router(reportes.router)
    logging.info("✅ Módulo de reportes (HU11/HU12) cargado correctamente.")
except ImportError as e:
    logging.warning(f"No se pudo importar el módulo de reportes: {e}")
