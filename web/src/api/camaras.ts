const API = import.meta.env.VITE_API_URL || "http://localhost:8000";

export type Camara = {
  id: string;
  nombre: string;
  ubicacion: string;
  hls: string;
};

export async function listarCamaras(): Promise<Camara[]> {
  const res = await fetch(`${API}/api/camaras/list`);
  if (!res.ok) throw new Error(`Error listando cámaras: ${res.status}`);
  const data = await res.json();
  // El endpoint retorna {"camaras": ["cam1", "cam2"]}, mapeamos al formato esperado
  return data.camaras.map((id: string) => ({
    id,
    nombre: `Cámara ${id}`,
    ubicacion: id === 'cam1' ? 'Frontal' : 'Trasera',
    hls: `http://localhost:8888/${id}/index.m3u8`
  }));
}
