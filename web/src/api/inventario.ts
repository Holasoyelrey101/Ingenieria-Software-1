const API_INV = import.meta.env.VITE_API_INVENTARIO;

export type StockItem = {
  producto_id: number;
  sku: string | null;
  nombre: string | null;
  cantidad: number;
};

export type ProductoResumen = {
  id: number;
  sku: string;
  nombre: string;
  precio?: number;
  stock_total?: number;
  alerta?: boolean;
};

export async function getProductos(): Promise<ProductoResumen[]> {
  const res = await fetch(`${API_INV}/productos`);
  if (!res.ok) throw new Error('Error al cargar productos');
  return res.json();
}

export async function getInventarioPorBodega(bodegaId: number): Promise<StockItem[]> {
  const res = await fetch(`${API_INV}/inventory/${bodegaId}`);
  if (!res.ok) throw new Error('Error al cargar inventario');
  return res.json();
}

export async function getAlerts() {
  const res = await fetch(`${API_INV}/alerts`);
  if (!res.ok) throw new Error('Error al cargar alertas');
  return res.json();
}

export async function ackAlert(id: number) {
  const res = await fetch(`${API_INV}/alerts/${id}/ack`, { method: 'PATCH' });
  if (!res.ok) throw new Error('Error al cerrar alerta');
  return res.text();
}

/** Útil para demo: simular movimiento (OUT) y ver inventario/alerta refrescar */
export async function postMovement(producto_id: number, bodega_id: number, cantidad: number) {
  const res = await fetch(`${API_INV}/movements`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ producto_id, bodega_id, tipo: 'OUT', cantidad })
  });
  if (!res.ok) throw new Error('Error al registrar movimiento');
  return res.text();
}