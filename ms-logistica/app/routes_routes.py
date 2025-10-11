from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel

from .db import Base, engine, get_db
from .models import Route, RouteStop

# Crear tablas si no existen (MVP)
Base.metadata.create_all(bind=engine)

router = APIRouter()

# ==== Schemas ====
class OrderIn(BaseModel):
    id: int
    lat: float
    lon: float


class OptimizeRequest(BaseModel):
    orders: List[OrderIn]


class StopOut(BaseModel):
    order_id: int
    sequence: int


class OptimizeResponse(BaseModel):
    route_id: int
    stops: List[StopOut]
    total_distance: Optional[float] = None  # km
    estimated_time: Optional[int] = None  # minutes


# ==== Endpoints ====
@router.post("/optimize", response_model=OptimizeResponse)
def optimize_route_endpoint(payload: OptimizeRequest, db: Session = Depends(get_db)):
    if not payload.orders:
        raise HTTPException(status_code=400, detail="orders cannot be empty")

    # 1) Preparar puntos para optimización (Nearest Neighbor + 2-opt)
    points = [(o.lat, o.lon) for o in payload.orders]
    order_ids = [o.id for o in payload.orders]
    from .optimizer import optimize_route as advanced_optimize, haversine

    optimized_indices = advanced_optimize(points)

    # 2) Construir paradas en orden
    ordered = [
        {"id": order_ids[idx], "sequence": seq}
        for seq, idx in enumerate(optimized_indices, start=1)
    ]

    # 3) Persistir ruta y paradas
    route = Route()
    db.add(route)
    db.flush()  # obtiene route.id

    to_persist = []
    for s in ordered:
        src = next(o for o in payload.orders if o.id == s["id"])
        to_persist.append(
            RouteStop(
                route_id=route.id,
                seq=s["sequence"],
                location={"lat": float(src.lat), "lng": float(src.lon)},
            )
        )
    db.add_all(to_persist)

    # 4) Métricas de distancia/tiempo
    total_distance_m = 0.0
    for i in range(len(optimized_indices) - 1):
        a = points[optimized_indices[i]]
        b = points[optimized_indices[i + 1]]
        total_distance_m += haversine(a, b)

    total_distance_km = total_distance_m / 1000.0
    estimated_time_minutes = int((total_distance_km / 40.0) * 60) if total_distance_km > 0 else 0

    route.distance_m = int(total_distance_m)
    route.duration_s = estimated_time_minutes * 60
    db.commit()

    return OptimizeResponse(
        route_id=route.id,
        stops=[StopOut(order_id=s["id"], sequence=s["sequence"]) for s in ordered],
        total_distance=total_distance_km,
        estimated_time=estimated_time_minutes,
    )


@router.get("/{route_id}")
def get_route(route_id: int, db: Session = Depends(get_db)):
    route = db.query(Route).filter(Route.id == route_id).first()
    if not route:
        raise HTTPException(status_code=404, detail="route not found")
    stops = (
        db.query(RouteStop)
        .filter(RouteStop.route_id == route_id)
        .order_by(RouteStop.sequence.asc())
        .all()
    )
    return {
        "route_id": route_id,
        "stops": [
            {"order_id": s.order_id, "sequence": s.sequence, "lat": s.lat, "lon": s.lon}
            for s in stops
        ],
    }
