const API = import.meta.env.VITE_API_URL || "http://localhost:8000";

export type Camara = {
  id: string;
  nombre: string;
  ubicacion: string;
  hls: string;
};

export async function listarCamaras(): Promise<Camara[]> {
  const res = await fetch(`${API}/camaras`);
  if (!res.ok) throw new Error(`Error listando cámaras: ${res.status}`);
  return res.json();
}
