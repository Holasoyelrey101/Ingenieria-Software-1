from fastapi import APIRouter, Query
import os
import httpx

router = APIRouter(prefix="/reportes", tags=["Reportes Consolidados"])

# Service URLs - default to docker compose service names; allow override via env
MS_LOGISTICA_URL = os.getenv("MS_LOGISTICA_URL", "http://ms-logistica:8000")
MS_INVENTARIO_URL = os.getenv("MS_INVENTARIO_URL", "http://ms-inventario:8000")


@router.get("/consolidados")
async def generar_reporte_consolidado(
    desde: str = Query(..., description="Fecha de inicio (YYYY-MM-DD)"),
    hasta: str = Query(..., description="Fecha de fin (YYYY-MM-DD)")
):
    """
    HU11 – Generar reportes consolidados
    Consolida información de incidentes (ms-logistica) con filtro por rango.
    Nota: Métricas de inventario/logística adicionales pueden ampliarse en iteraciones.
    """
    # Build incidents URL with date filters
    incidents_url = f"{MS_LOGISTICA_URL}/maps/incidents"
    params = {"created_from": f"{desde}T00:00:00", "created_to": f"{hasta}T23:59:59"}

    total_incidentes = 0
    total_productos = 0
    rutas_activas = 0
    movimientos_rango = 0
    alertas_rango = 0

    async with httpx.AsyncClient(timeout=20) as client:
        # Incidentes en rango (existe en ms-logistica)
        try:
            r = await client.get(incidents_url, params=params)
            if r.status_code == 200:
                incidentes = r.json()
                total_incidentes = len(incidentes)
            else:
                total_incidentes = 0
        except Exception:
            total_incidentes = 0

        # Inventario: total de productos actual (estado)
        try:
            prod_url = f"{MS_INVENTARIO_URL}/productos"
            rp = await client.get(prod_url)
            if rp.status_code == 200:
                productos = rp.json()
                total_productos = len(productos)
            else:
                total_productos = 0
        except Exception:
            total_productos = 0

        # Inventario: movimientos en rango
        try:
            mv_url = f"{MS_INVENTARIO_URL}/movements/count"
            rm = await client.get(mv_url, params={"desde": desde, "hasta": hasta})
            if rm.status_code == 200:
                movimientos_rango = rm.json().get("count", 0)
        except Exception:
            pass

        # Inventario: alertas en rango
        try:
            al_url = f"{MS_INVENTARIO_URL}/alerts/count"
            ra = await client.get(al_url, params={"desde": desde, "hasta": hasta})
            if ra.status_code == 200:
                alertas_rango = ra.json().get("count", 0)
        except Exception:
            pass

        # Logística: delivery requests en rango (puede filtrarse por status si se requiere activos)
        try:
            drc_url = f"{MS_LOGISTICA_URL}/maps/delivery_requests/count"
            rdc = await client.get(drc_url, params={"created_from": f"{desde}T00:00:00", "created_to": f"{hasta}T23:59:59"})
            if rdc.status_code == 200:
                rutas_activas = rdc.json().get("count", 0)
        except Exception:
            pass

    reporte = {
        "periodo": f"{desde} - {hasta}",
        "total_productos": total_productos,
        "rutas_activas": rutas_activas,
        "incidentes_registrados": total_incidentes,
        "movimientos_en_rango": movimientos_rango,
        "alertas_en_rango": alertas_rango,
    }

    return {"status": "success", "reporte": reporte}
