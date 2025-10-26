import React, { useEffect, useMemo, useState } from 'react';
import { getDeliveryRequests, postIncident, DeliveryRequest } from '../api/logistica';

export default function SecurityPage() {
  const [requests, setRequests] = useState<DeliveryRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form state
  const [deliveryId, setDeliveryId] = useState<number | ''>('');
  const [type, setType] = useState('');
  const [description, setDescription] = useState('');
  // No vehicle/driver inputs; guard shouldn't set them here

  const typeOptions = useMemo(() => ([
    { value: 'theft', label: 'Robo', severity: 'high' },
    { value: 'accident', label: 'Accidente', severity: 'high' },
    { value: 'assault', label: 'Asalto', severity: 'high' },
    { value: 'breakdown', label: 'Avería', severity: 'medium' },
    { value: 'smoke', label: 'Humo', severity: 'medium' },
    { value: 'lost_contact', label: 'Sin contacto', severity: 'medium' },
    { value: 'delay', label: 'Retraso', severity: 'low' },
  ]), []);
  const derivedSeverity = useMemo(() => typeOptions.find(t => t.value === type)?.severity || '', [type, typeOptions]);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const data = await getDeliveryRequests();
        setRequests(data);
      } catch (e: any) {
        setError(e.message || 'Error cargando cargamentos');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null); setSuccess(null);

    if (!deliveryId) {
      setError('Debes seleccionar un cargamento.');
      return;
    }
    if (!type || !description) {
      setError('Completa tipo y descripción.');
      return;
    }

    try {
      setLoading(true);
      const payload = {
        delivery_request_id: Number(deliveryId),
        type,
        // We send description as-is; backend derives severity
        description,
      } as any;
      await postIncident(payload as any);
      setSuccess('Incidente registrado.');
      // reset
      setType(''); setDescription('');
      setDeliveryId('');
    } catch (e: any) {
      setError(e.message || 'Error registrando incidente');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-semibold mb-1">Panel de Seguridad — Registrar incidente</h1>
      <p className="text-sm text-slate-500 mb-4">Rol: Guardia</p>

      {loading && <div className="mb-3 text-slate-600">Cargando…</div>}
      {error && <div className="mb-3 rounded bg-red-50 text-red-700 px-3 py-2 border border-red-200">{error}</div>}
      {success && <div className="mb-3 rounded bg-green-50 text-green-700 px-3 py-2 border border-green-200">{success}</div>}

      <form onSubmit={onSubmit} className="grid gap-3 bg-white/60 rounded border border-slate-200 p-4 shadow-sm">
        <label className="grid gap-1">
          <span className="text-sm text-slate-600">Cargamento (requerido)</span>
          <select className="border rounded px-2 py-1" value={deliveryId} onChange={e=> setDeliveryId(e.target.value ? Number(e.target.value) : '')}>
            <option value="">Seleccione…</option>
            {requests.map(r => (
              <option key={r.id} value={r.id}>#{r.id} — {r.status}</option>
            ))}
          </select>
        </label>
        <label className="grid gap-1">
          <span className="text-sm text-slate-600">Tipo (requerido)</span>
          <div className="flex flex-wrap gap-2">
            {typeOptions.map(opt => (
              <button type="button" key={opt.value}
                className={`px-3 py-1 rounded border text-sm ${type===opt.value ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-800 border-slate-300'}`}
                onClick={() => setType(opt.value)}>
                {opt.label}
              </button>
            ))}
          </div>
          {type && <span className="text-xs text-slate-500">Severidad derivada: {derivedSeverity || '—'}</span>}
        </label>
        <label className="grid gap-1">
          <span className="text-sm text-slate-600">Descripción (requerido)</span>
          <textarea className="border rounded px-2 py-1" value={description} onChange={e=> setDescription(e.target.value)} rows={3} />
        </label>
        <div className="pt-2">
          <button className="bg-slate-900 text-white px-3 py-2 rounded disabled:opacity-50" type="submit" disabled={loading}>Registrar incidente</button>
        </div>
      </form>
    </div>
  );
}
