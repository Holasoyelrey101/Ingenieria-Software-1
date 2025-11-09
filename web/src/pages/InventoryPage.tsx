import { useEffect, useMemo, useState, ChangeEvent } from 'react';
import { getInventarioPorBodega, getAlerts, postMovement, StockItem } from '../api/inventario';
import styles from './InventoryPage.module.css';

const BODEGAS = [
  { id: 1, nombre: 'Bodega Central' },
  { id: 2, nombre: 'Bodega Norte' },
];

export default function InventoryPage() {
  const [bodegaId, setBodegaId] = useState<number>(1);
  const [items, setItems] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [alertCount, setAlertCount] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  const loadData = async (id: number) => {
    setLoading(true); setError(null);
    try {
      const [inv, alerts] = await Promise.all([
        getInventarioPorBodega(id),
        getAlerts()
      ]);
      setItems(inv ?? []);
      const list = (alerts && (alerts.value ?? alerts)) || [];
      setAlertCount(list.length);
    } catch (e: any) {
      setError(e.message ?? 'Error cargando datos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(bodegaId);
    const t = setInterval(() => loadData(bodegaId), 15000);
    return () => clearInterval(t);
  }, [bodegaId]);

  const totalSKUs = useMemo(() => items.length, [items]);

  const onChangeBodega = (e: ChangeEvent<HTMLSelectElement>) => {
    setBodegaId(Number(e.target.value));
  };

  return (
    <div className={styles.root}>
      <h2>Inventario por Bodega</h2>
      <div className={styles.headerBar}>
        <label htmlFor="bodegaSel">Bodega:</label>
        <select id="bodegaSel" value={bodegaId} onChange={onChangeBodega}>
          {BODEGAS.map(b => <option key={b.id} value={b.id}>{b.nombre}</option>)}
        </select>
        <button onClick={() => loadData(bodegaId)} disabled={loading}>Actualizar</button>
        <span>{loading ? 'Cargando…' : `SKUs: ${totalSKUs}`}</span>
        <span style={{ marginLeft: 'auto' }}>
          <strong>Alertas: </strong>
          <span className={`${styles.badge} ${alertCount > 0 ? styles.badgeAlert : ''}`}>{alertCount}</span>
        </span>
      </div>
      {error && <p className={styles.error}>{error}</p>}
      <table className={styles.table}>
        <thead>
        <tr>
          <th>SKU</th>
          <th>Producto</th>
          <th>Cantidad</th>
          <th>Acciones (demo)</th>
        </tr>
        </thead>
        <tbody>
        {items.map(it => (
          <tr key={it.producto_id}>
            <td>{it.sku ?? '—'}</td>
            <td>{it.nombre ?? '—'}</td>
            <td style={{ textAlign: 'center' }}>{it.cantidad}</td>
            <td className={styles.actions}>
              <button onClick={async () => { await postMovement(it.producto_id, bodegaId, 1); await loadData(bodegaId); }} disabled={loading}>
                -1 (OUT)
              </button>
            </td>
          </tr>
        ))}
        {items.length === 0 && !loading && (
          <tr><td colSpan={4} className={styles.empty}>Sin datos</td></tr>
        )}
        </tbody>
      </table>
    </div>
  );
}
