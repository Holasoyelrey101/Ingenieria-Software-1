from fastapi import APIRouter, HTTPException

# Intentar importar la clase Camion desde ms_logistica
try:
    from ms_logistica.camion import Camion
except ModuleNotFoundError:
    # Si no existe, creamos una clase simulada para pruebas locales
    class Camion:
        def __init__(self, id, patente, modelo, camaras):
            self.id = id
            self.patente = patente
            self.modelo = modelo
            self.camaras = camaras

        def to_dict(self):
            return {
                "id": self.id,
                "patente": self.patente,
                "modelo": self.modelo,
                "camaras": self.camaras,
            }

router = APIRouter(prefix="/api/camiones", tags=["Camiones"])

# Datos de prueba
camiones_data = [
    Camion(id=1, patente="ABCD23", modelo="Volvo FH", camaras=["cam1_url", "cam2_url"]),
    Camion(id=2, patente="XYZ89", modelo="Scania R", camaras=["cam3_url"]),
]

@router.get("/", summary="Listar camiones con cámaras")
def listar_camiones():
    """Retorna todos los camiones registrados con sus cámaras asociadas"""
    return {"camiones": [c.to_dict() for c in camiones_data]}

@router.get("/{camion_id}", summary="Obtener detalle de un camión")
def obtener_camion(camion_id: int):
    """Obtiene un camión específico por su ID"""
    for camion in camiones_data:
        if camion.id == camion_id:
            return camion.to_dict()
    raise HTTPException(status_code=404, detail="Camión no encontrado")
