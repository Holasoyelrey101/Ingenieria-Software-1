import os
import httpx
from fastapi import APIRouter, HTTPException
from typing import List, Dict, Any
from sqlalchemy import text
from ..db import SessionLocal

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

@router.get("/delivery/{delivery_id}")
async def obtener_camaras_por_carga(delivery_id: int) -> Dict[str, Any]:
    """
    HU6: Obtiene las cámaras del vehículo asignado a una carga en tránsito.
    Criterio de aceptación: Selecciona una carga en tránsito, cuando accede 
    a su detalle entonces puede ver las imágenes en cámaras asociadas.
    """
    db = SessionLocal()
    try:
        # Obtener la carga con información del vehículo
        delivery = db.execute(
            text("""
            SELECT 
                dr.id, 
                dr.status, 
                dr.vehicle_id, 
                dr.origin_address, 
                dr.destination_address,
                v.code as vehicle_code
            FROM delivery_requests dr
            LEFT JOIN vehicles v ON dr.vehicle_id = v.id
            WHERE dr.id = :delivery_id
            """),
            {"delivery_id": delivery_id}
        ).fetchone()
        
        if not delivery:
            raise HTTPException(status_code=404, detail="Carga no encontrada")
        
        if not delivery.vehicle_id:
            return {
                "delivery_id": delivery_id,
                "status": delivery.status,
                "vehicle_id": None,
                "vehicle_code": None,
                "camaras": [],
                "message": "Esta carga no tiene vehículo asignado"
            }
        
        # Obtener cámaras del vehículo
        cameras = db.execute(
            text("""
            SELECT 
                vc.id,
                vc.camera_id,
                vc.camera_name,
                vc.position,
                vc.stream_url,
                vc.active
            FROM vehicle_cameras vc
            WHERE vc.vehicle_id = :vehicle_id AND vc.active = true
            ORDER BY vc.position
            """),
            {"vehicle_id": delivery.vehicle_id}
        ).fetchall()
        
        cameras_list = []
        for cam in cameras:
            # Verificar si stream está online
            is_online = await _probe_manifest(f"{MTX_INTERNAL_URL}/{cam.camera_id}/index.m3u8")
            cameras_list.append({
                "id": cam.id,
                "camera_id": cam.camera_id,
                "camera_name": cam.camera_name,
                "position": cam.position,
                "stream_url": cam.stream_url,
                "online": is_online,
                "m3u8_url": f"{MTX_PUBLIC_URL}/{cam.camera_id}/index.m3u8"
            })
        
        return {
            "delivery_id": delivery_id,
            "status": delivery.status,
            "vehicle_id": delivery.vehicle_id,
            "vehicle_code": delivery.vehicle_code,
            "origin": delivery.origin_address,
            "destination": delivery.destination_address,
            "camaras": cameras_list,
            "total_camaras": len(cameras_list)
        }
    finally:
        db.close()

@router.post("/vehicle/{vehicle_id}/camera")
async def asignar_camara_a_vehiculo(
    vehicle_id: int,
    camera_id: str,
    camera_name: str = None,
    position: str = "frontal"
) -> Dict[str, Any]:
    """
    Asigna una cámara a un vehículo (sin hardcodeo).
    Posiciones válidas: frontal, trasera, interior, lateral_izquierda, lateral_derecha
    """
    db = SessionLocal()
    try:
        # Verificar que el vehículo existe
        vehicle = db.execute(
            text("SELECT id, code FROM vehicles WHERE id = :vehicle_id"),
            {"vehicle_id": vehicle_id}
        ).fetchone()
        
        if not vehicle:
            raise HTTPException(status_code=404, detail="Vehículo no encontrado")
        
        # Insertar cámara
        result = db.execute(
            text("""
            INSERT INTO vehicle_cameras 
                (vehicle_id, camera_id, camera_name, position, stream_url, active)
            VALUES 
                (:vehicle_id, :camera_id, :camera_name, :position, :stream_url, true)
            RETURNING id
            """),
            {
                "vehicle_id": vehicle_id,
                "camera_id": camera_id,
                "camera_name": camera_name or f"Cámara {camera_id}",
                "position": position,
                "stream_url": f"{MTX_PUBLIC_URL}/{camera_id}/index.m3u8"
            }
        )
        db.commit()
        
        camera_db_id = result.fetchone()[0]
        
        return {
            "success": True,
            "id": camera_db_id,
            "vehicle_id": vehicle_id,
            "vehicle_code": vehicle.code,
            "camera_id": camera_id,
            "camera_name": camera_name or f"Cámara {camera_id}",
            "position": position,
            "stream_url": f"{MTX_PUBLIC_URL}/{camera_id}/index.m3u8",
            "message": f"Cámara {camera_id} asignada a vehículo {vehicle.code}"
        }
    except Exception as e:
        db.rollback()
        if "unique constraint" in str(e).lower():
            raise HTTPException(status_code=400, detail=f"La cámara {camera_id} ya está asignada a este vehículo")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()

@router.delete("/vehicle/{vehicle_id}/camera/{camera_id}")
async def desasignar_camara_de_vehiculo(vehicle_id: int, camera_id: str) -> Dict[str, Any]:
    """Desasigna una cámara de un vehículo"""
    db = SessionLocal()
    try:
        result = db.execute(
            text("""
            DELETE FROM vehicle_cameras 
            WHERE vehicle_id = :vehicle_id AND camera_id = :camera_id
            RETURNING id
            """),
            {"vehicle_id": vehicle_id, "camera_id": camera_id}
        )
        db.commit()
        
        deleted = result.fetchone()
        if not deleted:
            raise HTTPException(status_code=404, detail="Cámara no encontrada en este vehículo")
        
        return {
            "success": True,
            "message": f"Cámara {camera_id} desasignada del vehículo {vehicle_id}"
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()

@router.get("/vehicle/{vehicle_id}/cameras")
async def listar_camaras_de_vehiculo(vehicle_id: int) -> Dict[str, Any]:
    """Lista todas las cámaras asignadas a un vehículo"""
    db = SessionLocal()
    try:
        cameras = db.execute(
            text("""
            SELECT 
                vc.id,
                vc.camera_id,
                vc.camera_name,
                vc.position,
                vc.stream_url,
                vc.active,
                v.code as vehicle_code
            FROM vehicle_cameras vc
            JOIN vehicles v ON vc.vehicle_id = v.id
            WHERE vc.vehicle_id = :vehicle_id
            ORDER BY vc.position
            """),
            {"vehicle_id": vehicle_id}
        ).fetchall()
        
        cameras_list = []
        for cam in cameras:
            is_online = await _probe_manifest(f"{MTX_INTERNAL_URL}/{cam.camera_id}/index.m3u8")
            cameras_list.append({
                "id": cam.id,
                "camera_id": cam.camera_id,
                "camera_name": cam.camera_name,
                "position": cam.position,
                "stream_url": cam.stream_url,
                "active": cam.active,
                "online": is_online,
                "m3u8_url": f"{MTX_PUBLIC_URL}/{cam.camera_id}/index.m3u8"
            })
        
        return {
            "vehicle_id": vehicle_id,
            "vehicle_code": cameras[0].vehicle_code if cameras else None,
            "camaras": cameras_list,
            "total": len(cameras_list)
        }
    finally:
        db.close()


