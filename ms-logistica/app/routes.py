from fastapi import APIRouter, Depends, HTTPException
from datetime import datetime
from pydantic import BaseModel
import os
import httpx
from .optimizer import optimize_route
from .optimizer import haversine
import logging
from typing import List, Optional
from pydantic import Field
from fastapi import Depends
from .db import SessionLocal
from .models import DeliveryRequest, Incident
from sqlalchemy.orm import Session
from sqlalchemy import text

def encode_polyline(coords):
    # coords: list of (lat, lng) tuples or dicts {lat,lng}
    result = []
    prev_lat = 0
    prev_lng = 0
    for p in coords:
        lat = int(round(p[0] * 1e5)) if isinstance(p, (list, tuple)) else int(round(p['lat'] * 1e5))
        lng = int(round(p[1] * 1e5)) if isinstance(p, (list, tuple)) else int(round(p['lng'] * 1e5))
        dlat = lat - prev_lat
        dlng = lng - prev_lng
        for v in (dlat, dlng):
            v = v << 1
            if v < 0:
                v = ~v
            while v >= 0x20:
                result.append(chr((0x20 | (v & 0x1f)) + 63))
                v >>= 5
            result.append(chr(v + 63))
        prev_lat = lat
        prev_lng = lng
    return ''.join(result)

router = APIRouter()

GOOGLE_KEY = os.environ.get("GOOGLE_MAPS_SERVER_KEY") or ""
logger = logging.getLogger("ms-logistica.routes")


class AddressRequest(BaseModel):
    address: str


class DirectionsRequest(BaseModel):
    origin: dict
    destination: dict
    waypoints: list = []
    optimize: bool = True


@router.post("/geocode")
async def geocode(req: AddressRequest):
    # Try Google geocoding if key present, otherwise fall back to Nominatim (OSM)
    if GOOGLE_KEY:
        try:
            url = "https://maps.googleapis.com/maps/api/geocode/json"
            params = {"address": req.address, "key": GOOGLE_KEY}
            async with httpx.AsyncClient() as client:
                r = await client.get(url, params=params, timeout=15)
                try:
                    data = r.json()
                except Exception:
                    logging.warning("Google geocode returned non-json response")
                    data = None
            if data and data.get("status") == "OK":
                res = data["results"][0]
                loc = res["geometry"]["location"]
                return {"lat": loc["lat"], "lng": loc["lng"], "formatted_address": res.get("formatted_address")}
            logger.info("Google geocode failed or returned non-OK; falling back to Nominatim", extra={"address": req.address, "status": data.get('status') if data else None})
        except Exception:
            logger.exception("Google geocode request exception; falling back to Nominatim")

    # Nominatim fallback (OpenStreetMap)
    try:
        nom_url = "https://nominatim.openstreetmap.org/search"
        params = {"q": req.address, "format": "json", "limit": 5}
        async with httpx.AsyncClient(headers={"User-Agent": "lux-logistica/1.0 (dev)"}) as client:
            r = await client.get(nom_url, params=params, timeout=15)
            try:
                data = r.json()
            except Exception:
                logging.warning("Nominatim returned non-json response")
                data = None
        if not data:
            raise HTTPException(status_code=404, detail={"error": "not_found", "provider": "nominatim"})
        # return array of suggestions
        suggestions = []
        for item in data:
            suggestions.append({"lat": float(item.get("lat")), "lng": float(item.get("lon")), "display_name": item.get("display_name")})
        return suggestions
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Nominatim geocode error: %s", str(e))
        raise HTTPException(status_code=502, detail={"error": "geocode_failed", "detail": str(e)})


@router.post("/directions")
async def directions(req: DirectionsRequest):
    # If Google not configured, fall back to a local route generator (dev mode)
    if not GOOGLE_KEY:
        # build coords from origin, waypoints, destination
        pts = []
        def push_point(v):
            if v is None: return
            if isinstance(v, dict):
                if v.get('lat') is not None:
                    pts.append((v.get('lat'), v.get('lng')))
            elif isinstance(v, (list, tuple)):
                pts.append((v[0], v[1]))

        push_point(req.origin)
        for w in req.waypoints:
            push_point(w)
        push_point(req.destination)

        # compute simple optimized order for waypoints (keep origin/dest as endpoints)
        mid = pts[1:-1] if len(pts) > 2 else []
        optimized_idx = []
        if mid:
            order = optimize_route(mid)
            ordered = [mid[i] for i in order]
        else:
            ordered = []

        route_points = []
        if pts:
            route_points.append(pts[0])
            route_points.extend(ordered)
            if len(pts) > 1:
                route_points.append(pts[-1])

        # distance & duration estimation (simple sum of haversine, assume 40 km/h)
        total_m = 0
        for i in range(len(route_points)-1):
            total_m += haversine(route_points[i], route_points[i+1])
        avg_speed_m_s = 11.11  # ~40 km/h
        est_duration = int(total_m / avg_speed_m_s) if total_m > 0 else 0
        poly = encode_polyline(route_points)
        return {"polyline": poly, "distance_m": int(total_m), "duration_s": est_duration, "optimized_waypoints": None, "raw": {"note": "dev-fallback"}}
    # Otherwise call Google Directions API
    params = {
        "origin": f"{req.origin.get('lat')},{req.origin.get('lng')}" if req.origin.get('lat') else req.origin.get('address'),
        "destination": f"{req.destination.get('lat')},{req.destination.get('lng')}" if req.destination.get('lat') else req.destination.get('address'),
        "key": GOOGLE_KEY,
    }
    if req.waypoints:
        way = []
        for w in req.waypoints:
            if w.get('lat'):
                way.append(f"{w.get('lat')},{w.get('lng')}")
            else:
                way.append(w.get('address'))
        params["waypoints"] = "|".join(way)
    if req.optimize:
        params["optimize"] = "true"

    url = "https://maps.googleapis.com/maps/api/directions/json"
    async with httpx.AsyncClient() as client:
        r = await client.get(url, params=params, timeout=20)
        data = r.json()

    if data.get("status") != "OK":
        raise HTTPException(status_code=502, detail=data)

    # Basic response shaping
    route = data["routes"][0]
    legs = route.get("legs", [])
    distance = sum(leg.get("distance", {}).get("value", 0) for leg in legs)
    duration = sum(leg.get("duration", {}).get("value", 0) for leg in legs)
    polyline = route.get("overview_polyline", {}).get("points")

    # Optionally run local optimization over waypoints (if provided and optimize==true)
    if req.waypoints and req.optimize:
        # waypoints coords list
        coords = []
        for w in req.waypoints:
            if w.get('lat'):
                coords.append((w.get('lat'), w.get('lng')))
        optimized = optimize_route(coords)
    else:
        optimized = None

    return {"polyline": polyline, "distance_m": distance, "duration_s": duration, "optimized_waypoints": optimized, "raw": data}


# Delivery request endpoints (persist requests about vehicles en-route)


class DeliveryCreate(BaseModel):
    origin: Optional[dict] = None
    destination: Optional[dict] = None
    vehicle_id: Optional[str] = None
    payload: Optional[dict] = None


class DeliveryOut(BaseModel):
    id: int
    origin: Optional[dict]
    destination: Optional[dict]
    vehicle_id: Optional[str]
    status: str
    eta: Optional[int]
    payload: Optional[dict]
    created_at: Optional[str]


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.post('/delivery_requests', response_model=DeliveryOut)
def create_delivery_request(req: DeliveryCreate, db: Session = Depends(get_db)):
    dr = DeliveryRequest(
        origin=req.origin,
        destination=req.destination,
        vehicle_id=req.vehicle_id,
        payload=req.payload,
        status='pending'
    )
    db.add(dr)
    db.commit()
    db.refresh(dr)
    return dr


@router.get('/delivery_requests', response_model=List[DeliveryOut])
def list_delivery_requests(limit: int = 100, db: Session = Depends(get_db)):
    items = db.query(DeliveryRequest).order_by(DeliveryRequest.created_at.desc()).limit(limit).all()
    return items


# Incidents endpoints (HU5)

class IncidentCreate(BaseModel):
    # Required link to delivery request for traceability
    delivery_request_id: int
    route_id: Optional[int] = None
    route_stop_id: Optional[int] = None
    vehicle_id: Optional[int] = None
    driver_id: Optional[int] = None
    # severity will be derived from type if not provided; clients shouldn't send it
    severity: Optional[str] = None
    type: Optional[str] = None
    description: Optional[str] = None


class IncidentOut(BaseModel):
    id: int
    delivery_request_id: Optional[int]
    route_id: Optional[int]
    route_stop_id: Optional[int]
    vehicle_id: Optional[int]
    driver_id: Optional[int]
    severity: Optional[str]
    type: Optional[str]
    description: Optional[str]
    created_at: Optional[datetime]


@router.post('/incidents', response_model=IncidentOut)
def create_incident(req: IncidentCreate, db: Session = Depends(get_db)):
    # Minimal FK existence checks (best-effort) using raw SQL queries
    def exists(table: str, _id: int) -> bool:
        if _id is None:
            return True
        try:
            q = text(f"SELECT 1 FROM {table} WHERE id = :id LIMIT 1")
            return db.execute(q, {"id": _id}).first() is not None
        except Exception:
            # If table missing (dev), skip strict check
            return True

    # Validate delivery request existence (required)
    if not exists('delivery_requests', req.delivery_request_id):
        raise HTTPException(status_code=404, detail={"error": "delivery_request_not_found"})

    if req.route_id is not None and not exists('routes', req.route_id):
        raise HTTPException(status_code=404, detail={"error": "route_not_found"})
    if req.route_stop_id is not None and not exists('route_stops', req.route_stop_id):
        raise HTTPException(status_code=404, detail={"error": "route_stop_not_found"})
    if req.vehicle_id is not None and not exists('vehicles', req.vehicle_id):
        raise HTTPException(status_code=404, detail={"error": "vehicle_not_found"})
    if req.driver_id is not None and not exists('drivers', req.driver_id):
        raise HTTPException(status_code=404, detail={"error": "driver_not_found"})

    # Derive severity from type if not provided (simple mapping)
    sev = req.severity
    if not sev and req.type:
        t = (req.type or '').lower()
        mapping = {
            'theft': 'high',
            'robbery': 'high',
            'assault': 'high',
            'breakdown': 'medium',
            'delay': 'low',
            'smoke': 'medium',
            'accident': 'high',
            'lost_contact': 'medium',
        }
        sev = mapping.get(t, 'medium')

    item = Incident(
        delivery_request_id=req.delivery_request_id,
        route_id=req.route_id,
        route_stop_id=req.route_stop_id,
        vehicle_id=req.vehicle_id,
        driver_id=req.driver_id,
        severity=sev,
        type=req.type,
        description=req.description,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.get('/incidents', response_model=List[IncidentOut])
def list_incidents(
    route_id: Optional[int] = None,
    route_stop_id: Optional[int] = None,
    vehicle_id: Optional[int] = None,
    driver_id: Optional[int] = None,
    delivery_request_id: Optional[int] = None,
    severity: Optional[str] = None,
    type: Optional[str] = None,
    created_from: Optional[datetime] = None,
    created_to: Optional[datetime] = None,
    limit: int = 100,
    offset: int = 0,
    order: str = 'desc',
    db: Session = Depends(get_db)
):
    q = db.query(Incident)
    if delivery_request_id is not None:
        q = q.filter(Incident.delivery_request_id == delivery_request_id)
    if route_id is not None:
        q = q.filter(Incident.route_id == route_id)
    if route_stop_id is not None:
        q = q.filter(Incident.route_stop_id == route_stop_id)
    if vehicle_id is not None:
        q = q.filter(Incident.vehicle_id == vehicle_id)
    if driver_id is not None:
        q = q.filter(Incident.driver_id == driver_id)
    if severity is not None:
        q = q.filter(Incident.severity == severity)
    if type is not None:
        q = q.filter(Incident.type == type)
    if created_from is not None:
        q = q.filter(Incident.created_at >= created_from)
    if created_to is not None:
        q = q.filter(Incident.created_at <= created_to)

    if order.lower() == 'asc':
        q = q.order_by(Incident.created_at.asc())
    else:
        q = q.order_by(Incident.created_at.desc())

    items = q.offset(max(offset, 0)).limit(max(min(limit, 1000), 1)).all()
    return items


@router.get('/incidents/{incident_id}', response_model=IncidentOut)
def get_incident(incident_id: int, db: Session = Depends(get_db)):
    item = db.query(Incident).filter(Incident.id == incident_id).first()
    if not item:
        raise HTTPException(status_code=404, detail={"error": "incident_not_found"})
    return item
