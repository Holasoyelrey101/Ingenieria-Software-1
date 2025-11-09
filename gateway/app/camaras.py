import os
import httpx
from fastapi import APIRouter, HTTPException
from typing import List, Dict, Any

router = APIRouter(prefix="/camaras", tags=["camaras"])

# Configuración desde variables de entorno
_CAM_IDS = os.getenv("CAM_IDS", "cam1,cam2")
CAM_LIST = [c.strip() for c in _CAM_IDS.split(",") if c.strip()]

MTX_PUBLIC_URL = os.getenv("MTX_PUBLIC_URL", "http://localhost:8888").rstrip("/")
MTX_INTERNAL_URL = os.getenv("MTX_INTERNAL_URL", "http://mediamtx:8888").rstrip("/")

@router.get("/list")
def listar_camaras() -> Dict[str, List[str]]:
    """Lista todas las cámaras disponibles"""
    return {"camaras": CAM_LIST}

@router.get("/hls/{cam_id}")
def obtener_hls(cam_id: str) -> Dict[str, str]:
    """Obtiene la URL HLS de una cámara específica"""
    if cam_id not in CAM_LIST:
        raise HTTPException(status_code=404, detail="Cámara no encontrada")
    
    # Mantener el naming actual: clave "m3u8"
    return {"m3u8": f"{MTX_PUBLIC_URL}/{cam_id}/index.m3u8"}

@router.get("/health/{cam_id}")
async def verificar_camara(cam_id: str) -> Dict[str, Any]:
    """Verifica si una cámara está activa y transmitiendo"""
    if cam_id not in CAM_LIST:
        raise HTTPException(status_code=404, detail="Cámara no encontrada")
    
    hls_url = f"{MTX_INTERNAL_URL}/{cam_id}/index.m3u8"
    
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            response = await client.head(hls_url)
            online = response.status_code == 200
            
            return {
                "cam_id": cam_id,
                "online": online,
                "status_code": response.status_code,
                "url": f"{MTX_PUBLIC_URL}/{cam_id}/index.m3u8"
            }
    except Exception as e:
        return {
            "cam_id": cam_id,
            "online": False,
            "error": str(e),
            "url": f"{MTX_PUBLIC_URL}/{cam_id}/index.m3u8"
        }

@router.get("/health")
async def verificar_todas() -> Dict[str, List[Dict]]:
    """Verifica el estado de todas las cámaras"""
    resultados = []
    
    async with httpx.AsyncClient(timeout=3.0) as client:
        for cam_id in CAM_LIST:
            hls_url = f"{MTX_INTERNAL_URL}/{cam_id}/index.m3u8"
            try:
                response = await client.head(hls_url)
                resultados.append({
                    "cam_id": cam_id,
                    "online": response.status_code == 200,
                    "url": f"{MTX_PUBLIC_URL}/{cam_id}/index.m3u8"
                })
            except:
                resultados.append({
                    "cam_id": cam_id,
                    "online": False,
                    "url": f"{MTX_PUBLIC_URL}/{cam_id}/index.m3u8"
                })
    
    return {"camaras": resultados}