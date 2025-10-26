from fastapi import APIRouter, HTTPException
import random

router = APIRouter(tags=["camaras"])


@router.get("/estado")
async def obtener_estado_camaras():
    """
    Simula la obtención del estado de las cámaras en tiempo real.
    En el futuro, se integrará con el módulo IoT del sistema.
    """
    try:
        camaras = [
            {"id": 1, "ubicacion": "Acceso Principal", "estado": random.choice(["Operativa", "Sin señal", "Mantenimiento"])},
            {"id": 2, "ubicacion": "Zona de Carga 1", "estado": random.choice(["Operativa", "Sin señal", "Mantenimiento"])},
            {"id": 3, "ubicacion": "Zona de Carga 2", "estado": random.choice(["Operativa", "Sin señal", "Mantenimiento"])},
            {"id": 4, "ubicacion": "Oficinas Centrales", "estado": random.choice(["Operativa", "Sin señal", "Mantenimiento"])},
        ]
        return {"total": len(camaras), "camaras": camaras}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener cámaras: {e}")
