import React, { useState, useEffect } from 'react';
import { getShifts, createShift, deleteShift, type Shift, type ShiftCreate } from '../../api/rrhh';

const SHIFT_TYPES = ['Mañana', 'Tarde', 'Noche'] as const;
const SHIFT_TIMES: Record<string, { start: string; end: string }> = {
  'Mañana': { start: '06:00', end: '14:00' },
  'Tarde': { start: '14:00', end: '22:00' },
  'Noche': { start: '22:00', end: '06:00' }
};

export default function AdminTurnosPage() {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);

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
      setSelectedShift(null);
      await fetchShifts();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear turno');
    }
  }

  async function handleDeleteShift(id: number) {
    if (!confirm('¿Eliminar este turno? Se perderán todas las asignaciones asociadas.')) return;

    try {
      await deleteShift(id);
      await fetchShifts();
      setSelectedShift(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar turno');
    }
  }

  const handleSelectShift = (shift: Shift) => {
    setSelectedShift(shift);
    setFormData({
      tipo: shift.tipo,
      start_time: shift.start_time as any,
      end_time: shift.end_time as any,
      timezone: shift.timezone
    });
    setShowForm(false);
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setSelectedShift(null);
    setFormData({ tipo: 'Mañana', start_time: '06:00' as any, end_time: '14:00' as any, timezone: 'America/Santiago' });
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-3xl font-bold mb-2">⚙️ Panel Administrativo de Turnos</h2>
        <p className="text-gray-600">Gestiona los tipos de turno y sus horarios</p>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <div className="grid grid-cols-3 gap-6">
        {/* Panel izquierdo: Lista de turnos */}
        <div className="col-span-1 bg-white rounded-lg shadow">
          <div className="p-4 border-b bg-gray-50">
            <h3 className="font-bold text-lg">📋 Turnos Actuales</h3>
          </div>

          <div className="p-4 space-y-2 max-h-96 overflow-y-auto">
            {loading ? (
              <div className="text-center text-gray-500 py-4">Cargando...</div>
            ) : shifts.length === 0 ? (
              <div className="text-center text-gray-500 py-4 italic">No hay turnos</div>
            ) : (
              shifts.map((shift) => (
                <div
                  key={shift.id}
                  onClick={() => handleSelectShift(shift)}
                  className={`p-3 rounded cursor-pointer transition border-l-4 ${
                    selectedShift?.id === shift.id
                      ? 'bg-blue-100 border-blue-500 border-l-4'
                      : 'bg-gray-50 border-gray-300 hover:bg-gray-100'
                  }`}
                >
                  <div className="font-bold text-sm">{shift.tipo}</div>
                  <div className="text-xs text-gray-600">{shift.start_time}-{shift.end_time}</div>
                </div>
              ))
            )}
          </div>

          <div className="p-4 border-t bg-gray-50">
            <button
              onClick={() => {
                setShowForm(!showForm);
                setSelectedShift(null);
                if (!showForm) {
                  setFormData({ tipo: 'Mañana', start_time: '06:00' as any, end_time: '14:00' as any, timezone: 'America/Santiago' });
                }
              }}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded transition"
            >
              {showForm ? '✕ Cancelar' : '+ Nuevo Turno'}
            </button>
          </div>
        </div>

        {/* Panel central: Formulario */}
        <div className="col-span-1 bg-white rounded-lg shadow p-6">
          {showForm || selectedShift ? (
            <form onSubmit={handleCreateShift} className="space-y-4">
              <h3 className="font-bold text-lg mb-4">
                {selectedShift ? '📝 Detalles del Turno' : '✏️ Nuevo Turno'}
              </h3>

              <div>
                <label className="block text-gray-700 text-sm font-bold mb-3">Tipo de Turno</label>
                <div className="flex flex-col gap-2">
                  {SHIFT_TYPES.map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => handleTypeChange(type)}
                      className={`px-4 py-2 rounded font-medium transition-colors text-sm ${
                        formData.tipo === type
                          ? 'bg-blue-600 text-white shadow-md'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2">Hora de Inicio</label>
                <input
                  type="time"
                  value={formData.start_time}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-600 cursor-not-allowed text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">Se establece automáticamente</p>
              </div>

              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2">Hora de Fin</label>
                <input
                  type="time"
                  value={formData.end_time}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-600 cursor-not-allowed text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">Se establece automáticamente</p>
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded transition"
                >
                  {selectedShift ? '💾 Actualizar' : '✓ Crear'}
                </button>
                <button
                  type="button"
                  onClick={handleCancelForm}
                  className="flex-1 bg-gray-400 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded transition"
                >
                  Cancelar
                </button>
              </div>
            </form>
          ) : (
            <div className="text-center text-gray-500 py-12 italic">
              Selecciona un turno o crea uno nuevo
            </div>
          )}
        </div>

        {/* Panel derecho: Detalles extendidos */}
        {selectedShift && (
          <div className="col-span-1 bg-white rounded-lg shadow p-6">
            <h3 className="font-bold text-lg mb-4">📊 Información Detallada</h3>

            <div className="space-y-4">
              <div className="bg-blue-50 rounded p-3 border-l-4 border-blue-500">
                <p className="text-xs text-gray-600 font-semibold">Tipo de Turno</p>
                <p className="text-xl font-bold text-blue-900">{selectedShift.tipo}</p>
              </div>

              <div className="bg-green-50 rounded p-3 border-l-4 border-green-500">
                <p className="text-xs text-gray-600 font-semibold">Horario</p>
                <p className="text-lg font-semibold text-green-900">
                  {selectedShift.start_time} - {selectedShift.end_time}
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  {calculateDuration(selectedShift.start_time, selectedShift.end_time)} horas
                </p>
              </div>

              <div className="bg-gray-50 rounded p-3 border-l-4 border-gray-400">
                <p className="text-xs text-gray-600 font-semibold">ID</p>
                <p className="text-sm font-mono text-gray-900">{selectedShift.id}</p>
              </div>

              <div className="pt-4 border-t">
                <button
                  onClick={() => handleDeleteShift(selectedShift.id)}
                  className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded transition"
                >
                  🗑️ Eliminar Turno
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Tabla de referencia */}
      <div className="mt-8 bg-gray-50 rounded-lg p-6 border border-gray-200">
        <h3 className="font-bold text-lg mb-4">📚 Horarios Preconfigurados</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-200">
              <tr>
                <th className="px-4 py-2 text-left">Tipo</th>
                <th className="px-4 py-2 text-left">Inicio</th>
                <th className="px-4 py-2 text-left">Fin</th>
                <th className="px-4 py-2 text-left">Duración</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(SHIFT_TIMES).map(([tipo, times]) => (
                <tr key={tipo} className="border-b hover:bg-gray-100">
                  <td className="px-4 py-2 font-semibold">{tipo}</td>
                  <td className="px-4 py-2">{times.start}</td>
                  <td className="px-4 py-2">{times.end}</td>
                  <td className="px-4 py-2">{calculateDuration(times.start, times.end)} h</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-gray-600 mt-3 italic">
          💡 Zona horaria fija: Santiago, Chile (America/Santiago)
        </p>
      </div>
    </div>
  );
}

// Helper: Calculate duration between two times
function calculateDuration(start: string, end: string): number {
  const [startHour, startMin] = start.split(':').map(Number);
  const [endHour, endMin] = end.split(':').map(Number);

  let duration = (endHour * 60 + endMin) - (startHour * 60 + startMin);
  
  // Handle overnight shifts (e.g., 22:00 to 06:00)
  if (duration < 0) {
    duration += 24 * 60;
  }

  return duration / 60; // Convert to hours
}
