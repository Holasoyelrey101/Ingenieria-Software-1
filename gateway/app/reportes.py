from fastapi import APIRouter, Query
import os
import httpx

router = APIRouter(prefix="/reportes", tags=["Reportes Consolidados"])

MS_INVENTARIO = os.environ.get("MS_INVENTARIO_URL", "http://ms-inventario:8000")
MS_LOGISTICA = os.environ.get("MS_LOGISTICA_URL", "http://ms-logistica:8000")


@router.get("/consolidados")
async def generar_reporte_consolidado(
    desde: str = Query(..., description="Fecha de inicio (YYYY-MM-DD)"),
    hasta: str = Query(..., description="Fecha de fin (YYYY-MM-DD)")
):
    """Consolida métricas desde ms-inventario y ms-logistica con filtros de fecha."""
    async with httpx.AsyncClient(timeout=20.0) as client:
        # Productos totales
        inv_products = await client.get(f"{MS_INVENTARIO}/productos")
        productos = inv_products.json() if inv_products.status_code == 200 else []

        # Incidentes en rango
        incidents = await client.get(
            f"{MS_LOGISTICA}/maps/incidents",
            params={"created_from": desde + "T00:00:00", "created_to": hasta + "T23:59:59"}
        )
        incidentes = incidents.json() if incidents.status_code == 200 else []

        # Movimientos count en rango
        mov_count = await client.get(
            f"{MS_INVENTARIO}/movements/count",
            params={"desde": desde, "hasta": hasta}
        )
        movimientos_en_rango = mov_count.json().get("count", 0) if mov_count.status_code == 200 else 0

        # Alertas count en rango
        alerts_count = await client.get(
            f"{MS_INVENTARIO}/alerts/count",
            params={"desde": desde, "hasta": hasta}
        )
        alertas_en_rango = alerts_count.json().get("count", 0) if alerts_count.status_code == 200 else 0

        # Rutas (delivery requests) activas en rango
        dr_count = await client.get(
            f"{MS_LOGISTICA}/maps/delivery_requests/count",
            params={"created_from": desde + "T00:00:00", "created_to": hasta + "T23:59:59"}
        )
        rutas_activas = dr_count.json().get("count", 0) if dr_count.status_code == 200 else 0

    reporte = {
        "periodo": f"{desde} - {hasta}",
        "total_productos": len(productos),
        "rutas_activas": rutas_activas,
        "incidentes_registrados": len(incidentes),
        "movimientos_en_rango": movimientos_en_rango,
        "alertas_en_rango": alertas_en_rango,
    }
    return {"status": "success", "reporte": reporte}
