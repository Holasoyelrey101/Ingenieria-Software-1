const API_LOG =
  import.meta.env.VITE_API_LOGISTICA ||
  import.meta.env.VITE_API_URL ||
  'http://localhost:8001';

export type DeliveryRequest = {
  id: number;
  origin?: Record<string, any> | null;
  destination?: Record<string, any> | null;
  vehicle_id?: string | null;
  status: string;
  eta?: number | null;
  payload?: Record<string, any> | null;
  created_at?: string | null;
};

export type IncidentCreate = {
  delivery_request_id: number;
  route_id?: number | null;
  route_stop_id?: number | null;
  vehicle_id?: number | null;
  driver_id?: number | null;
  // severity will be derived server-side from type if not specified
  severity?: string | null;
  type?: string | null;
  description?: string | null;
};

export type IncidentOut = Required<IncidentCreate> & { id: number; created_at?: string | null };

export async function getDeliveryRequests(): Promise<DeliveryRequest[]> {
  const res = await fetch(`${API_LOG}/maps/delivery_requests`);
  if (!res.ok) throw new Error('Error al cargar cargamentos');
  return res.json();
}

export async function postIncident(payload: IncidentCreate): Promise<IncidentOut> {
  const res = await fetch(`${API_LOG}/maps/incidents`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    let detail = '';
    try { detail = await res.text(); } catch {}
    throw new Error('Error al registrar incidente: ' + detail);
  }
  return res.json();
}
