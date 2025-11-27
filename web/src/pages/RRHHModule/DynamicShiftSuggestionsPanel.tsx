import React, { useState, useEffect } from 'react';
import {
  getPendingDynamicShifts,
  getAvailableDrivers,
  autoAssignDriver,
  type DynamicShift,
  type AvailableDriver
} from '../../api/rrhh';

interface DynamicShiftSuggestionsPanelProps {
  onRefresh?: () => void;
}

export default function DynamicShiftSuggestionsPanel({ onRefresh }: DynamicShiftSuggestionsPanelProps) {
  const [pendingShifts, setPendingShifts] = useState<DynamicShift[]>([]);
  const [availableDrivers, setAvailableDrivers] = useState<Map<number, AvailableDriver[]>>(new Map());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedShiftId, setExpandedShiftId] = useState<number | null>(null);
  const [assigningShiftId, setAssigningShiftId] = useState<number | null>(null);

  useEffect(() => {
    loadPendingShifts();
  }, []);

  async function loadPendingShifts() {
    setLoading(true);
    setError(null);
    try {
      const shifts = await getPendingDynamicShifts();
      setPendingShifts(shifts);
      
      // Cargar conductores disponibles para cada turno
      const driversMap = new Map<number, AvailableDriver[]>();
      for (const shift of shifts) {
        const drivers = await getAvailableDrivers(shift.id);
        driversMap.set(shift.id, drivers);
      }
      setAvailableDrivers(driversMap);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar turnos dinámicos');
    } finally {
      setLoading(false);
    }
  }

  async function handleAutoAssign(shiftId: number, employeeId: number) {
    setAssigningShiftId(shiftId);
    try {
      await autoAssignDriver(shiftId, employeeId);
      // Recargar datos
      await loadPendingShifts();
      onRefresh?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al asignar conductor');
    } finally {
      setAssigningShiftId(null);
    }
  }

  const formatTime = (timeStr: string) => {
    return timeStr.substring(0, 5); // HH:MM
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}min`;
  };

  if (loading) {
    return <div className="p-4 bg-blue-50 rounded">⏳ Cargando turnos dinámicos...</div>;
  }

  if (pendingShifts.length === 0) {
    return (
      <div className="p-4 bg-green-50 rounded">
        ✅ No hay turnos dinámicos pendientes de asignar
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border-l-4 border-orange-500 p-4 rounded mb-6">
      <div className="flex items-center mb-4">
        <span className="text-2xl mr-2">⚡</span>
        <h3 className="text-xl font-bold text-orange-900">
          {pendingShifts.length} Rutas sin Asignar
        </h3>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 p-2 rounded mb-4">
          {error}
        </div>
      )}

      <div className="space-y-3">
        {pendingShifts.map((shift) => {
          const drivers = availableDrivers.get(shift.id) || [];
          const isExpanded = expandedShiftId === shift.id;
          const availableCount = drivers.filter(d => d.puede_asignarse).length;

          return (
            <div key={shift.id} className="bg-white rounded-lg shadow-md p-4">
              {/* Header */}
              <button
                onClick={() => setExpandedShiftId(isExpanded ? null : shift.id)}
                className="w-full text-left hover:bg-orange-50 p-2 rounded transition"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-bold text-lg">
                      📍 Ruta #{shift.route_id}
                    </div>
                    <div className="text-sm text-gray-600">
                      {new Date(shift.fecha_programada).toLocaleDateString('es-CL')} -{' '}
                      {formatTime(shift.hora_inicio)} ({formatDuration(shift.duracion_minutos)})
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {availableCount > 0 ? (
                      <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-semibold">
                        {availableCount} disponible{availableCount !== 1 ? 's' : ''}
                      </span>
                    ) : (
                      <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-semibold">
                        Sin disponibles
                      </span>
                    )}
                    <span className="text-xl">{isExpanded ? '▼' : '▶'}</span>
                  </div>
                </div>
              </button>

              {/* Expanded Content - Conductores Disponibles */}
              {isExpanded && (
                <div className="mt-4 pt-4 border-t-2 border-orange-200">
                  {drivers.length === 0 ? (
                    <p className="text-gray-500 italic">No hay conductores registrados</p>
                  ) : (
                    <div className="space-y-2">
                      {drivers.map((driver) => (
                        <div
                          key={driver.employee_id}
                          className={`p-3 rounded-lg border-2 flex items-center justify-between transition ${
                            driver.puede_asignarse
                              ? 'border-green-300 bg-green-50'
                              : 'border-red-300 bg-red-50 opacity-60'
                          }`}
                        >
                          <div>
                            <div className="font-semibold">{driver.nombre}</div>
                            <div className="text-sm text-gray-600">{driver.email}</div>
                            <div className="text-xs text-gray-500 mt-1">
                              Conducción hoy: {driver.horas_conduccion_hoy.toFixed(1)}h / 5h máx
                            </div>
                            {!driver.puede_asignarse && driver.razon_no_disponible && (
                              <div className="text-xs text-red-600 mt-1 font-semibold">
                                ❌ {driver.razon_no_disponible}
                              </div>
                            )}
                          </div>
                          {driver.puede_asignarse && (
                            <button
                              onClick={() => handleAutoAssign(shift.id, driver.employee_id)}
                              disabled={assigningShiftId === shift.id}
                              className="bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white px-4 py-2 rounded font-semibold transition"
                            >
                              {assigningShiftId === shift.id ? '⏳ Asignando...' : '✓ Asignar'}
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-4 text-sm text-gray-600">
        💡 Tip: Expande cada ruta para ver conductores disponibles. Las asignaciones son automáticas.
      </div>
    </div>
  );
}
