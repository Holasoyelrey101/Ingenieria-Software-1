import React, { useState, useEffect } from 'react';
import { getShifts, createShift, deleteShift, type Shift, type ShiftCreate } from '../../api/rrhh';

const SHIFT_TYPES = ['Mañana', 'Tarde', 'Noche'] as const;
const SHIFT_TIMES: Record<string, { start: string; end: string }> = {
  'Mañana': { start: '06:00', end: '14:00' },
  'Tarde': { start: '14:00', end: '22:00' },
  'Noche': { start: '22:00', end: '06:00' }
};

export default function ShiftsPage() {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const [formData, setFormData] = useState<ShiftCreate>({
    tipo: 'Mañana',
    start_time: '06:00' as any,
    end_time: '14:00' as any,
    timezone: 'America/Santiago'
  });

  // Load shifts on mount
  useEffect(() => {
    fetchShifts();
  }, []);

  async function fetchShifts() {
    setLoading(true);
    setError(null);
    try {
      const data = await getShifts();
      setShifts(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }

  const handleTypeChange = (tipo: string) => {
    const times = SHIFT_TIMES[tipo as keyof typeof SHIFT_TIMES];
    setFormData({
      ...formData,
      tipo,
      start_time: times.start as any,
      end_time: times.end as any
    });
  };

  async function handleCreateShift(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    try {
      await createShift(formData);
      setFormData({ tipo: 'Mañana', start_time: '06:00' as any, end_time: '14:00' as any, timezone: 'America/Santiago' });
      setShowForm(false);
      await fetchShifts();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear turno');
    }
  }

  async function handleDeleteShift(id: number) {
    if (!confirm('¿Eliminar este turno?')) return;

    try {
      await deleteShift(id);
      await fetchShifts();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar turno');
    }
  }

  return (
    <div className="p-6">
      <h2 className="text-3xl font-bold mb-6">Gestión de Turnos</h2>

      {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">{error}</div>}

      <button
        className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded mb-4"
        onClick={() => setShowForm(!showForm)}
      >
        {showForm ? 'Cancelar' : '+ Nuevo Turno'}
      </button>

      {showForm && (
        <form onSubmit={handleCreateShift} className="bg-white shadow-md rounded px-8 py-6 mb-6">
          <div className="mb-6">
            <label className="block text-gray-700 text-sm font-bold mb-3">Tipo de Turno</label>
            <div className="flex gap-2">
              {SHIFT_TYPES.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => handleTypeChange(type)}
                  className={`px-4 py-2 rounded font-medium transition-colors ${
                    formData.tipo === type
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2">Hora de inicio</label>
            <input
              type="time"
              value={formData.start_time}
              readOnly
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-600 cursor-not-allowed"
            />
            <p className="text-xs text-gray-500 mt-1">Se establece automáticamente según el tipo de turno</p>
          </div>

          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2">Hora de fin</label>
            <input
              type="time"
              value={formData.end_time}
              readOnly
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-600 cursor-not-allowed"
            />
            <p className="text-xs text-gray-500 mt-1">Se establece automáticamente según el tipo de turno</p>
          </div>

          <button type="submit" className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded">
            Guardar Turno
          </button>
        </form>
      )}

      {loading ? (
        <div className="text-center py-8">Cargando turnos...</div>
      ) : shifts.length === 0 ? (
        <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded">
          No hay turnos registrados
        </div>
      ) : (
        <div className="overflow-x-auto bg-white rounded-lg shadow">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Inicio</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fin</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {shifts.map((shift) => (
                <tr key={shift.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{shift.id}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{shift.tipo}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{shift.start_time}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{shift.end_time}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <button
                      className="bg-red-600 hover:bg-red-700 text-white font-bold py-1 px-3 rounded text-xs"
                      onClick={() => handleDeleteShift(shift.id)}
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
