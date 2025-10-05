from fastapi import FastAPI
from app.routers import inventario, movimientos, alerts
from fastapi.middleware.cors import CORSMiddleware
import os

app = FastAPI(title="ms-inventario")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get('/health')
def health():
    return {'status':'ok'}

app.include_router(inventario.router, prefix="", tags=["inventario"]) 
app.include_router(movimientos.router, prefix="", tags=["movimientos"]) 
app.include_router(alerts.router, prefix="", tags=["alerts"]) 
