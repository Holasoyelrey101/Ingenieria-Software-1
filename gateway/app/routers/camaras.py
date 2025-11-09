import os
import httpx
from fastapi import APIRouter, HTTPException
from typing import List, Dict, Any

router = APIRouter(prefix="/camaras", tags=["camaras"])

# Vars de entorno
CAM_LIST = [c.strip() for c in os.getenv("CAM_IDS", "cam1,cam2").split(",") if c.strip()]
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

async def _probe_manifest(hls_url: str) -> bool:
    """Usa GET (no HEAD) y verifica presencia de #EXTM3U."""
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            r = await client.get(hls_url)
            return (r.status_code == 200) and ("#EXTM3U" in r.text[:300])
    except Exception:
        return False

@router.get("/health/{cam_id}")
async def health_cam(cam_id: str) -> Dict[str, Any]:
    if cam_id not in CAM_LIST:
        raise HTTPException(status_code=404, detail="Cámara no encontrada")
    online = await _probe_manifest(f"{MTX_INTERNAL_URL}/{cam_id}/index.m3u8")
    return {
        "cam_id": cam_id,
        "online": online,
        "url": f"{MTX_PUBLIC_URL}/{cam_id}/index.m3u8"
    }

@router.get("/health")
async def health_all() -> Dict[str, List[Dict[str, Any]]]:
    res: List[Dict[str, Any]] = []
    for cam in CAM_LIST:
        ok = await _probe_manifest(f"{MTX_INTERNAL_URL}/{cam}/index.m3u8")
        res.append({
            "cam_id": cam,
            "online": ok,
            "url": f"{MTX_PUBLIC_URL}/{cam}/index.m3u8"
        })
    return {"camaras": res}
