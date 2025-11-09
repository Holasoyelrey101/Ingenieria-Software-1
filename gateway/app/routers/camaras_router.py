from fastapi import APIRouter
import os

router = APIRouter(prefix="/camaras", tags=["camaras"])

MTX = os.getenv("MTX_PUBLIC_URL", "http://localhost:8888").rstrip("/")

def _cams():
    ids = [c.strip() for c in os.getenv("CAM_IDS", "cam1").split(",") if c.strip()]
    return [{"id": cid, "hls": f"{MTX}/{cid}/index.m3u8"} for cid in ids]

@router.get("/list")
def list_camaras():
    return _cams()

@router.get("/hls/{cam_id}")
def cam_hls(cam_id: str):
    return {"hls": f"{MTX}/{cam_id}/index.m3u8"}
