import React, { useState, useEffect } from 'react';
import {
  getPendingDynamicShifts,
  getAvailableDrivers,
  autoAssignDriver,
  unassignDriver,
  listDynamicShifts,
  getEmployees,
  type DynamicShift,
  type AvailableDriver,
  type Employee
} from '../../api/rrhh';
import DynamicShiftSuggestionsPanel from './DynamicShiftSuggestionsPanel';

export default function ConductorsSchedulePage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [dynamicShifts, setDynamicShifts] = useState<DynamicShift[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unassigningId, setUnassigningId] = useState<number | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const [empData, shiftsData] = await Promise.all([
        getEmployees(),
        listDynamicShifts()
      ]);
      setEmployees(empData);
      setDynamicShifts(shiftsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar datos');
    } finally {
      setLoading(false);
    }
  }

  async function handleUnassign(shiftId: number) {
    if (!confirm('¿Desasignar este turno? El conductor deberá ser reasignado.')) {
      return;
    }

    setUnassigningId(shiftId);
    try {
      await unassignDriver(shiftId);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al desasignar');
    } finally {
      setUnassigningId(null);
    }
  }

  const todaysShifts = dynamicShifts.filter(
    (shift) => shift.fecha_programada === selectedDate && shift.status === 'asignado'
  );

  const formatTime = (timeStr: string) => {
    return timeStr.substring(0, 5); // HH:MM
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}min`;
  };

  const handlePrevDay = () => {
    const prev = new Date(selectedDate);
    prev.setDate(prev.getDate() - 1);
    setSelectedDate(prev.toISOString().split('T')[0]);
  };

  const handleNextDay = () => {
    const next = new Date(selectedDate);
    next.setDate(next.getDate() + 1);
    setSelectedDate(next.toISOString().split('T')[0]);
  };

  const handleToday = () => {
    setSelectedDate(new Date().toISOString().split('T')[0]);
  };

  if (loading) {
    return <div className="p-8 text-center">⏳ Cargando...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">🚚 Turnos de Conductores</h1>
          <p className="text-gray-300">Gestión de rutas y asignaciones dinámicas</p>
        </div>

        {error && (
          <div className="bg-red-500/20 border border-red-500 text-red-200 p-4 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Panel de Asignación Dinámica */}
        <div className="mb-8">
          <DynamicShiftSuggestionsPanel onRefresh={loadData} />
        </div>

        {/* Sección de Horarios Diarios */}
        <div className="bg-white rounded-lg shadow-2xl overflow-hidden">
          {/* Date Navigation */}
          <div className="bg-gradient-to-r from-orange-600 to-red-600 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-white">📅 Horarios del Día</h2>
              <div className="flex gap-2">
                <button
                  onClick={handlePrevDay}
                  className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg transition"
                >
                  ← Anterior
                </button>
                <button
                  onClick={handleToday}
                  className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg transition"
                >
                  Hoy
                </button>
                <button
                  onClick={handleNextDay}
                  className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg transition"
                >
                  Siguiente →
                </button>
              </div>
            </div>

            {/* Date Display */}
            <div className="flex items-center gap-4">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-4 py-2 rounded-lg bg-white text-slate-900 font-semibold"
              />
              <span className="text-white text-lg font-semibold">
                {new Date(selectedDate).toLocaleDateString('es-CL', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </span>
            </div>
          </div>

          {/* Shifts Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-100 border-b-2 border-slate-300">
                <tr>
                  <th className="p-4 text-left font-semibold text-slate-900">Conductor</th>
                  <th className="p-4 text-left font-semibold text-slate-900">Ruta #</th>
                  <th className="p-4 text-left font-semibold text-slate-900">Hora Inicio</th>
                  <th className="p-4 text-left font-semibold text-slate-900">Duración</th>
                  <th className="p-4 text-left font-semibold text-slate-900">Hora Fin (est.)</th>
                  <th className="p-4 text-center font-semibold text-slate-900">Estado</th>
                  <th className="p-4 text-center font-semibold text-slate-900">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {todaysShifts.length > 0 ? (
                  todaysShifts
                    .sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio))
                    .map((shift, idx) => {
                      const assignment = shift.assignments?.[0];
                      const conductor = employees.find((e) => e.id === assignment?.employee_id);
                      
                      // Calcular hora fin
                      const [hours, minutes, seconds] = shift.hora_inicio.split(':').map(Number);
                      const startDate = new Date();
                      startDate.setHours(hours, minutes, 0);
                      const endDate = new Date(startDate.getTime() + shift.duracion_minutos * 60000);
                      const endTime = `${String(endDate.getHours()).padStart(2, '0')}:${String(endDate.getMinutes()).padStart(2, '0')}`;

                      return (
                        <tr
                          key={shift.id}
                          className={`border-b transition ${
                            idx % 2 === 0 ? 'bg-white hover:bg-orange-50' : 'bg-slate-50 hover:bg-orange-50'
                          }`}
                        >
                          <td className="p-4 font-semibold text-blue-600">{conductor?.nombre || 'N/A'}</td>
                          <td className="p-4 text-slate-700">#{shift.route_id}</td>
                          <td className="p-4 font-mono text-lg font-bold text-slate-900">
                            {formatTime(shift.hora_inicio)}
                          </td>
                          <td className="p-4 text-slate-700">
                            {formatDuration(shift.duracion_minutos)}
                          </td>
                          <td className="p-4 font-mono text-slate-700">{endTime}</td>
                          <td className="p-4 text-center">
                            <span className="inline-block bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-bold">
                              ✓ Asignado
                            </span>
                          </td>
                          <td className="p-4 text-center">
                            <button
                              onClick={() => handleUnassign(shift.id)}
                              disabled={unassigningId === shift.id}
                              className="bg-red-500 hover:bg-red-600 disabled:bg-gray-400 text-white px-3 py-1 rounded text-xs font-bold transition"
                              title="Desasignar conductor"
                            >
                              {unassigningId === shift.id ? '⏳' : '✕ Desasignar'}
                            </button>
                          </td>
                        </tr>
                      );
                    })
                ) : (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-gray-500">
                      <div className="text-lg">
                        📭 No hay rutas asignadas para esta fecha
                      </div>
                      <div className="text-sm mt-2">
                        Usa el panel superior para asignar conductores a rutas
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Summary Stats */}
          <div className="bg-slate-50 p-6 border-t-2 border-slate-200 grid grid-cols-3 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-500">
              <div className="text-2xl font-bold text-blue-600">{todaysShifts.length}</div>
              <div className="text-sm text-blue-700">Rutas Asignadas</div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg border-l-4 border-green-500">
              <div className="text-2xl font-bold text-green-600">
                {new Set(todaysShifts.map((s) => s.assignments?.[0]?.employee_id)).size}
              </div>
              <div className="text-sm text-green-700">Conductores Trabajando</div>
            </div>
            <div className="bg-orange-50 p-4 rounded-lg border-l-4 border-orange-500">
              <div className="text-2xl font-bold text-orange-600">
                {Math.round(
                  todaysShifts.reduce((acc, s) => acc + s.duracion_minutos, 0) / 60 * 10
                ) / 10}
              </div>
              <div className="text-sm text-orange-700">Horas Totales</div>
            </div>
          </div>
        </div>

        {/* Info Box */}
        <div className="mt-8 bg-blue-50 border-l-4 border-blue-500 p-6 rounded-lg">
          <h3 className="font-bold text-blue-900 mb-2">💡 Cómo funciona:</h3>
          <ul className="text-blue-800 space-y-1 text-sm">
            <li>• <strong>Panel Superior:</strong> Expande una ruta para ver conductores disponibles y asigna con un click</li>
            <li>• <strong>Validación Automática:</strong> Solo se muestran conductores con menos de 5h de conducción</li>
            <li>• <strong>Tabla Diaria:</strong> Ve todos los horarios de conducción para cualquier día</li>
            <li>• <strong>Horarios:</strong> El sistema calcula automáticamente la hora de fin basada en la duración</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
