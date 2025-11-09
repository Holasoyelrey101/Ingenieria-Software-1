import os
import httpx
from fastapi import APIRouter, HTTPException
from typing import List, Dict, Any

router = APIRouter(prefix="/camaras", tags=["camaras"])

# Vars desde entorno
_CAM_IDS = os.getenv("CAM_IDS", "cam1,cam2")
CAM_LIST = [c.strip() for c in _CAM_IDS.split(",") if c.strip()]

MTX_PUBLIC_URL = os.getenv("MTX_PUBLIC_URL", "http://localhost:8888").rstrip("/")
MTX_INTERNAL_URL = os.getenv("MTX_INTERNAL_URL", "http://mediamtx:8888").rstrip("/")

@router.get("/list")
def listar_camaras() -> Dict[str, List[str]]:
    return {"camaras": CAM_LIST}

@router.get("/hls/{cam_id}")
def obtener_hls(cam_id: str) -> Dict[str, str]:
    if cam_id not in CAM_LIST:
        raise HTTPException(status_code=404, detail="Cámara no encontrada")
    return {"m3u8": f"{MTX_PUBLIC_URL}/{cam_id}/index.m3u8"}

async def _check_one(client: httpx.AsyncClient, cam_id: str) -> Dict[str, Any]:
    m3u8_internal = f"{MTX_INTERNAL_URL}/{cam_id}/index.m3u8"
    try:
        # MediaMTX suele dar 404 a HEAD; usamos GET.
        r = await client.get(m3u8_internal, timeout=3.0)
        online = (r.status_code == 200 and r.text.startswith("#EXTM3U"))
        return {
            "cam_id": cam_id,
            "online": online,
            "status_code": r.status_code,
            "url": f"{MTX_PUBLIC_URL}/{cam_id}/index.m3u8",
        }
    except Exception as e:
        return {
            "cam_id": cam_id,
            "online": False,
            "error": str(e),
            "url": f"{MTX_PUBLIC_URL}/{cam_id}/index.m3u8",
        }

@router.get("/health/{cam_id}")
async def verificar_camara(cam_id: str) -> Dict[str, Any]:
    if cam_id not in CAM_LIST:
        raise HTTPException(status_code=404, detail="Cámara no encontrada")
    async with httpx.AsyncClient() as client:
        return await _check_one(client, cam_id)

@router.get("/health")
async def verificar_todas() -> Dict[str, List[Dict[str, Any]]]:
    async with httpx.AsyncClient() as client:
        resultados = [await _check_one(client, cam) for cam in CAM_LIST]
    return {"camaras": resultados}
