from fastapi import APIRouter, Query
import requests

# ------------------------------------------------------
# CONFIGURACIÓN DEL ROUTER
# ------------------------------------------------------

# Este objeto `router` es el que FastAPI espera en main.py
router = APIRouter(
    prefix="/reportes",
    tags=["Reportes Consolidados"]
)

# ------------------------------------------------------
# ENDPOINT: HU11 - GENERAR REPORTES CONSOLIDADOS
# ------------------------------------------------------

# URLs base de los microservicios (puedes ajustarlas si cambian los puertos)
INVENTARIO_URL = "http://127.0.0.1:8001"
LOGISTICA_URL = "http://127.0.0.1:8002"
SEGURIDAD_URL = "http://127.0.0.1:8003"

@router.get("/consolidados")
def generar_reporte_consolidado(
    desde: str = Query(..., description="Fecha de inicio (YYYY-MM-DD)"),
    hasta: str = Query(..., description="Fecha de fin (YYYY-MM-DD)")
):
    """
    HU11 – Generar reportes consolidados
    Consolida información de los microservicios de inventario, logística y seguridad.
    """
    try:
        inventario = requests.get(f"{INVENTARIO_URL}/inventario").json()
        logistica = requests.get(f"{LOGISTICA_URL}/rutas").json()
        seguridad = requests.get(f"{SEGURIDAD_URL}/incidentes").json()

        reporte = {
            "periodo": f"{desde} - {hasta}",
            "total_productos": len(inventario),
            "rutas_activas": len(logistica),
            "incidentes_registrados": len(seguridad)
        }

        return {"status": "success", "reporte": reporte}

    except requests.exceptions.ConnectionError:
        return {
            "status": "error",
            "detalle": "Uno o más microservicios no están disponibles. Verifica las URLs o los contenedores."
        }

    except Exception as e:
        return {"status": "error", "detalle": str(e)}
