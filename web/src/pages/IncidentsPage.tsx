import React, { useEffect, useMemo, useState } from 'react';
import { getIncidents, getDeliveryRequests, DeliveryRequest, IncidentsFilter, IncidentOut } from '../api/logistica';

export default function IncidentsPage() {
  const [requests, setRequests] = useState<DeliveryRequest[]>([]);
  const [items, setItems] = useState<IncidentOut[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [deliveryId, setDeliveryId] = useState<number | ''>('');
  const [type, setType] = useState('');
  const [severity, setSeverity] = useState('');

  const typeOptions = useMemo(() => ([
    { value: '', label: 'Todos' },
    { value: 'theft', label: 'Robo' },
    { value: 'accident', label: 'Accidente' },
    { value: 'assault', label: 'Asalto' },
    { value: 'breakdown', label: 'Avería' },
    { value: 'smoke', label: 'Humo' },
    { value: 'lost_contact', label: 'Sin contacto' },
    { value: 'delay', label: 'Retraso' },
  ]), []);

  const severityOptions = [
    { value: '', label: 'Todas' },
    { value: 'low', label: 'Baja' },
    { value: 'medium', label: 'Media' },
    { value: 'high', label: 'Alta' },
  ];

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const [reqs, incs] = await Promise.all([
          getDeliveryRequests(),
          getIncidents({ order: 'desc', limit: 100 })
        ]);
        setRequests(reqs);
        setItems(incs);
      } catch (e: any) {
        setError(e.message || 'Error cargando historial');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const applyFilters = async () => {
    setError(null);
    setLoading(true);
    try {
      const filter: IncidentsFilter = { order: 'desc', limit: 100 };
      if (deliveryId !== '') filter.delivery_request_id = Number(deliveryId);
      if (type) filter.type = type;
      if (severity) filter.severity = severity as any;
      const incs = await getIncidents(filter);
      setItems(incs);
    } catch (e: any) {
      setError(e.message || 'Error aplicando filtros');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="text-2xl font-semibold mb-2">Historial de incidentes</h1>
      <p className="text-sm text-slate-500 mb-4">Filtros por cargamento, tipo y severidad</p>

      <div className="bg-white/60 border border-slate-200 rounded p-4 mb-4 grid gap-3 md:grid-cols-4">
        <label className="grid gap-1">
          <span className="text-sm text-slate-600">Cargamento</span>
          <select className="border rounded px-2 py-1" value={deliveryId} onChange={e=> setDeliveryId(e.target.value ? Number(e.target.value) : '')}>
            <option value="">Todos</option>
            {requests.map(r => (
              <option key={r.id} value={r.id}>#{r.id} — {r.status}</option>
            ))}
          </select>
        </label>
        <label className="grid gap-1">
          <span className="text-sm text-slate-600">Tipo</span>
          <select className="border rounded px-2 py-1" value={type} onChange={e=> setType(e.target.value)}>
            {typeOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </label>
        <label className="grid gap-1">
          <span className="text-sm text-slate-600">Severidad</span>
          <select className="border rounded px-2 py-1" value={severity} onChange={e=> setSeverity(e.target.value)}>
            {severityOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </label>
        <div className="flex items-end">
          <button onClick={applyFilters} className="bg-slate-900 text-white px-3 py-2 rounded disabled:opacity-50" disabled={loading}>Aplicar</button>
        </div>
      </div>

      {error && <div className="mb-3 rounded bg-red-50 text-red-700 px-3 py-2 border border-red-200">{error}</div>}
      {loading && <div className="mb-3 text-slate-600">Cargando…</div>}
      {!loading && items.length === 0 && !error && (
        <div className="text-slate-500 border border-dashed border-slate-300 rounded p-6 text-center">No hay incidentes para los filtros actuales.</div>
      )}

      {items.length > 0 && (
        <div className="overflow-auto border border-slate-200 rounded">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="text-left px-3 py-2">ID</th>
                <th className="text-left px-3 py-2">Cargamento</th>
                <th className="text-left px-3 py-2">Tipo</th>
                <th className="text-left px-3 py-2">Severidad</th>
                <th className="text-left px-3 py-2">Descripción</th>
                <th className="text-left px-3 py-2">Fecha</th>
              </tr>
            </thead>
            <tbody>
              {items.map(it => (
                <tr key={it.id} className="border-t border-slate-200">
                  <td className="px-3 py-2">{it.id}</td>
                  <td className="px-3 py-2">{it.delivery_request_id ?? '—'}</td>
                  <td className="px-3 py-2">{it.type ?? '—'}</td>
                  <td className="px-3 py-2">{it.severity ?? '—'}</td>
                  <td className="px-3 py-2">{it.description ?? '—'}</td>
                  <td className="px-3 py-2">{it.created_at ? new Date(it.created_at).toLocaleString() : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
