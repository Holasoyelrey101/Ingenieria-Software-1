import { useEffect, useState } from 'react';
import { getAlerts, ackAlert } from '../api/inventario';
import styles from './AlertsPage.module.css';

export interface AlertItem {
  id: number;
  producto_id: number;
  bodega_id: number;
  tipo: string;
  mensaje: string;
  leida: boolean;
  created_at?: string;
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [soloNoLeidas, setSoloNoLeidas] = useState(true);
  const [filtroTipo, setFiltroTipo] = useState<string>('');

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const raw = await getAlerts();
      const list: AlertItem[] = (raw && (raw.value ?? raw)) || [];
      setAlerts(list);
    } catch (e:any) {
      setError(e.message ?? 'Error cargando alertas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); const t = setInterval(load, 15000); return () => clearInterval(t); }, []);

  const filtered = alerts.filter(a => {
    if (soloNoLeidas && a.leida) return false;
    if (filtroTipo && a.tipo !== filtroTipo) return false;
    return true;
  });

  const tipos = Array.from(new Set(alerts.map(a => a.tipo))).sort();

  const ackOne = async (id: number) => {
    await ackAlert(id); await load();
  };

  return (
    <div className={styles.root}>
      <h2>Alertas de Inventario</h2>
      <div className={styles.filters}>
        <label><input type="checkbox" checked={soloNoLeidas} onChange={e => setSoloNoLeidas(e.target.checked)} /> Solo no leídas</label>
        <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}>
          <option value="">Todos los tipos</option>
          {tipos.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <button onClick={load} disabled={loading}>{loading ? 'Actualizando…' : 'Refrescar'}</button>
      </div>
      {error && <div className={styles.error}>{error}</div>}
      <div className={styles.list}>
        <div className={`${styles.row} ${styles.rowHeader}`}>
          <div>ID</div>
          <div>Tipo</div>
            <div>Mensaje</div>
          <div>Estado</div>
          <div>Acciones</div>
        </div>
        {filtered.map(a => (
          <div key={a.id} className={styles.row}>
            <div>{a.id}</div>
            <div>
              <span className={`${styles.badge} ${a.tipo === 'CRITICO' ? styles.badgeCrit : a.tipo === 'LOW_STOCK' ? styles.badgeWarn : ''}`}>{a.tipo}</span>
            </div>
            <div>{a.mensaje}</div>
            <div>{a.leida ? 'Leída' : 'Pendiente'}</div>
            <div>
              {!a.leida && <button className={styles.ackBtn} onClick={() => ackOne(a.id)}>ACK</button>}
            </div>
          </div>
        ))}
        {filtered.length === 0 && !loading && (
          <div className={styles.empty}>Sin alertas</div>
        )}
      </div>
    </div>
  );
}
