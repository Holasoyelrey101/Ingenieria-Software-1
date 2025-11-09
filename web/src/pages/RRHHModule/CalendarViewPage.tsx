import React, { useState, useEffect } from 'react';
import {
  getEmployees,
  getShifts,
  listAssignments,
  createAssignment,
  deleteAssignment,
  getWeeklySuggestions,
  listDynamicShifts,
  type Employee,
  type Shift,
  type ShiftAssignment,
  type SuggestionsData,
  type DynamicShift
} from '../../api/rrhh';
import DynamicShiftSuggestionsPanel from './DynamicShiftSuggestionsPanel';

const SHIFT_TYPES = ['Mañana', 'Tarde', 'Noche'];
const WEEKDAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

interface DragData {
  employeeId: number;
  employeeName: string;
}

export default function CalendarViewPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [assignments, setAssignments] = useState<ShiftAssignment[]>([]);
  const [suggestions, setSuggestions] = useState<SuggestionsData | null>(null);
  const [dynamicShifts, setDynamicShifts] = useState<DynamicShift[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draggedEmployee, setDraggedEmployee] = useState<DragData | null>(null);
  const [dragOverCell, setDragOverCell] = useState<string | null>(null);

  // Semana base para mostrar (lunes de la semana actual)
  const [weekStart, setWeekStart] = useState(() => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    const monday = new Date(today.setDate(diff));
    return monday;
  });

  // Form para nueva asignación
  const [showForm, setShowForm] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number>(0);
  const [selectedShiftType, setSelectedShiftType] = useState<string>('Mañana');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [bulkSelectEmployees, setBulkSelectEmployees] = useState<Set<number>>(new Set());
  const [conflictWarning, setConflictWarning] = useState<string | null>(null);

  // Load data
  useEffect(() => {
    loadAllData();
  }, []);

  async function loadAllData() {
    setLoading(true);
    setError(null);
    try {
      const [empData, shiftData, assignData, suggestionsData, dynamicData] = await Promise.all([
        getEmployees(),
        getShifts(),
        listAssignments(),
        getWeeklySuggestions(),
        listDynamicShifts()
      ]);
      setEmployees(empData);
      setShifts(shiftData);
      setAssignments(assignData);
      setSuggestions(suggestionsData);
      setDynamicShifts(dynamicData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar datos');
    } finally {
      setLoading(false);
    }
  }

  // Obtener asignación para una fecha específica
  const getAssignmentForCell = (employeeId: number, shiftType: string, date: string) => {
    return assignments.find(
      (a) =>
        a.employee_id === employeeId &&
        a.date === date &&
        shifts.find((s) => s.id === a.shift_id)?.tipo === shiftType
    );
  };

  // Validar conflicto en tiempo real
  const checkConflict = (empId: number, date: string) => {
    const existing = assignments.find(
      (a) => a.employee_id === empId && a.date === date
    );
    if (existing) {
      const shift = shifts.find((s) => s.id === existing.shift_id);
      setConflictWarning(
        `⚠️ Ya asignado: ${shift?.tipo} (${shift?.start_time}-${shift?.end_time})`
      );
      return true;
    }
    setConflictWarning(null);
    return false;
  };

  // Crear asignación
  async function handleCreateAssignment() {
    if (!selectedEmployeeId || !selectedDate) {
      setError('Selecciona empleado y fecha');
      return;
    }

    if (checkConflict(selectedEmployeeId, selectedDate)) {
      return;
    }

    try {
      const shift = shifts.find((s) => s.tipo === selectedShiftType);
      if (!shift) throw new Error('Turno no encontrado');

      await createAssignment({
        employee_id: selectedEmployeeId,
        shift_id: shift.id,
        date: selectedDate,
        notes: ''
      });

      setSelectedEmployeeId(0);
      setSelectedDate('');
      setShowForm(false);
      await loadAllData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear asignación');
    }
  }

  // Bulk assign (múltiples empleados a la vez)
  async function handleBulkAssign() {
    if (bulkSelectEmployees.size === 0 || !selectedDate) {
      setError('Selecciona empleados y fecha');
      return;
    }

    setLoading(true);
    try {
      const shift = shifts.find((s) => s.tipo === selectedShiftType);
      if (!shift) throw new Error('Turno no encontrado');

      const failedEmployees: number[] = [];
      for (const empId of bulkSelectEmployees) {
        try {
          await createAssignment({
            employee_id: empId,
            shift_id: shift.id,
            date: selectedDate,
            notes: ''
          });
        } catch (err) {
          failedEmployees.push(empId);
        }
      }

      if (failedEmployees.length > 0) {
        const failedNames = failedEmployees
          .map((id) => employees.find((e) => e.id === id)?.nombre)
          .join(', ');
        setError(`No se pudieron asignar: ${failedNames} (posible conflicto)`);
      }

      setBulkSelectEmployees(new Set());
      setSelectedDate('');
      setShowForm(false);
      await loadAllData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error en asignación en lote');
    } finally {
      setLoading(false);
    }
  }

  // Eliminar asignación
  async function handleDeleteAssignment(assignmentId: number) {
    if (!confirm('¿Eliminar asignación?')) return;

    try {
      await deleteAssignment(assignmentId);
      await loadAllData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar');
    }
  }

  // ===== DRAG AND DROP HANDLERS =====
  const handleEmployeeDragStart = (employee: Employee) => {
    setDraggedEmployee({ employeeId: employee.id, employeeName: employee.nombre });
  };

  const handleEmployeeDragEnd = () => {
    setDraggedEmployee(null);
    setDragOverCell(null);
  };

  const handleCellDragOver = (shiftType: string, date: string) => {
    if (draggedEmployee) {
      setDragOverCell(`${shiftType}-${date}`);
    }
  };

  const handleCellDragLeave = () => {
    setDragOverCell(null);
  };

  const handleCellDrop = async (shiftType: string, date: string) => {
    setDragOverCell(null);
    if (!draggedEmployee) return;

    const empId = draggedEmployee.employeeId;

    // Validar conflicto
    const hasConflict = assignments.some(
      (a) => a.employee_id === empId && a.date === date
    );
    if (hasConflict) {
      setError(`⚠️ ${draggedEmployee.employeeName} ya tiene turno asignado el ${date}`);
      return;
    }

    try {
      const shift = shifts.find((s) => s.tipo === shiftType);
      if (!shift) throw new Error('Turno no encontrado');

      await createAssignment({
        employee_id: empId,
        shift_id: shift.id,
        date: date,
        notes: `Asignado por drag-and-drop`
      });

      setError(null);
      await loadAllData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al asignar');
    } finally {
      setDraggedEmployee(null);
    }
  };

  // Generar fechas de la semana
  const getWeekDates = () => {
    const dates = [];
    const start = new Date(weekStart);
    for (let i = 0; i < 7; i++) {
      const date = new Date(start);
      date.setDate(date.getDate() + i);
      dates.push(date.toISOString().split('T')[0]);
    }
    return dates;
  };

  const weekDates = getWeekDates();
  const weekDateLabels = weekDates.map((d) => {
    const date = new Date(d);
    return `${date.getDate()}/${date.getMonth() + 1}`;
  });

  if (loading && employees.length === 0) {
    return <div className="p-6 text-center">Cargando...</div>;
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold">📅 Calendario de Turnos</h2>
        <div className="flex gap-2">
          <button
            onClick={() => {
              const prev = new Date(weekStart);
              prev.setDate(prev.getDate() - 7);
              setWeekStart(prev);
            }}
            className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded"
          >
            ← Semana Anterior
          </button>
          <button
            onClick={() => {
              const next = new Date(weekStart);
              next.setDate(next.getDate() + 7);
              setWeekStart(next);
            }}
            className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded"
          >
            Semana Siguiente →
          </button>
        </div>
      </div>

      {/* Dynamic Shifts Suggestions Panel (Rutas) */}
      <DynamicShiftSuggestionsPanel onRefresh={loadAllData} />

      {/* Sugerencias de Cobertura */}
      {suggestions && (suggestions.uncovered_shifts.length > 0 || suggestions.unassigned_employees.length > 0) && (
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-4 rounded">
          <div className="grid grid-cols-2 gap-4">
            {suggestions.uncovered_shifts.length > 0 && (
              <div>
                <h3 className="font-bold text-blue-900 mb-2">⚠️ Turnos sin Cobertura</h3>
                <ul className="text-sm text-blue-800 space-y-1">
                  {suggestions.uncovered_shifts.slice(0, 5).map((shift, idx) => (
                    <li key={idx} className="flex items-center gap-2">
                      <span className="bg-blue-500 text-white rounded px-2 py-1 text-xs font-bold">
                        {shift.weekday.substring(0, 3)}
                      </span>
                      {shift.shift_tipo} ({shift.start_time}-{shift.end_time})
                    </li>
                  ))}
                  {suggestions.uncovered_shifts.length > 5 && (
                    <li className="text-gray-600 italic">+{suggestions.uncovered_shifts.length - 5} más</li>
                  )}
                </ul>
              </div>
            )}
            {suggestions.unassigned_employees.length > 0 && (
              <div>
                <h3 className="font-bold text-blue-900 mb-2">👤 Empleados sin Asignaciones</h3>
                <ul className="text-sm text-blue-800 space-y-1">
                  {suggestions.unassigned_employees.slice(0, 5).map((emp) => (
                    <li key={emp.id} className="flex items-center gap-2">
                      <span className="text-xs">•</span>
                      {emp.nombre}
                      {emp.assignments_this_week > 0 && (
                        <span className="text-xs text-gray-600">({emp.assignments_this_week} turnos)</span>
                      )}
                    </li>
                  ))}
                  {suggestions.unassigned_employees.length > 5 && (
                    <li className="text-gray-600 italic">+{suggestions.unassigned_employees.length - 5} más</li>
                  )}
                </ul>
              </div>
            )}
          </div>
          <p className="text-xs text-gray-600 mt-2">
            💡 Sugerencia: Arrastra empleados de la lista a las celdas del calendario para asignar turnos rápidamente
          </p>
        </div>
      )}

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {conflictWarning && (
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-4">
          {conflictWarning}
        </div>
      )}

      {/* Botones de acción */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => {
            setShowForm(!showForm);
            setBulkSelectEmployees(new Set());
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        >
          {showForm ? '✕ Cerrar' : '+ Nueva Asignación'}
        </button>
        {bulkSelectEmployees.size > 0 && (
          <button
            onClick={handleBulkAssign}
            className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
          >
            ✓ Asignar {bulkSelectEmployees.size} Empleados
          </button>
        )}
      </div>

      {/* Formulario de asignación + Drag&Drop */}
      {showForm && (
        <div className="bg-white shadow-md rounded px-8 py-6 mb-6">
          <div className="grid grid-cols-3 gap-6 mb-4">
            {/* Panel izquierdo: Empleados Draggable */}
            <div className="border-r pr-4">
              <label className="block text-gray-700 font-bold mb-3">👇 Arrastra Empleado:</label>
              <div className="bg-gray-50 rounded p-3 max-h-64 overflow-y-auto border border-dashed border-blue-300">
                {employees.length === 0 ? (
                  <div className="text-gray-500 text-sm italic">No hay empleados</div>
                ) : (
                  employees.map((e) => (
                    <div
                      key={e.id}
                      draggable
                      onDragStart={() => handleEmployeeDragStart(e)}
                      onDragEnd={handleEmployeeDragEnd}
                      className={`bg-white border-l-4 border-blue-500 p-2 mb-2 rounded cursor-move hover:shadow-md transition ${
                        draggedEmployee?.employeeId === e.id ? 'opacity-50 shadow-lg' : ''
                      }`}
                      title="Arrastra a una celda del calendario"
                    >
                      <div className="font-semibold text-sm">{e.nombre}</div>
                      <div className="text-xs text-gray-600">{e.activo ? '✓ Activo' : '✗ Inactivo'}</div>
                    </div>
                  ))
                )}
              </div>
              <p className="text-xs text-gray-600 mt-2 italic">💡 O usa el formulario a la derecha</p>
            </div>

            {/* Panel central: Asignación Individual */}
            <div>
              <label className="block text-gray-700 font-bold mb-3">📋 Asignación Manual:</label>
              <div className="space-y-3">
                <div>
                  <label className="block text-gray-700 text-sm font-semibold mb-1">Tipo de Turno</label>
                  <select
                    value={selectedShiftType}
                    onChange={(e) => {
                      setSelectedShiftType(e.target.value);
                      setConflictWarning(null);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  >
                    {SHIFT_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-gray-700 text-sm font-semibold mb-1">Fecha</label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => {
                      setSelectedDate(e.target.value);
                      setConflictWarning(null);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 text-sm font-semibold mb-1">Empleado</label>
                  <select
                    value={selectedEmployeeId}
                    onChange={(e) => {
                      const empId = parseInt(e.target.value) || 0;
                      setSelectedEmployeeId(empId);
                      if (empId && selectedDate) {
                        checkConflict(empId, selectedDate);
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  >
                    <option value={0}>-- Selecciona --</option>
                    {employees.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={handleCreateAssignment}
                  disabled={!selectedEmployeeId || !selectedDate}
                  className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-bold py-2 rounded text-sm"
                >
                  ✓ Asignar
                </button>
              </div>
            </div>

            {/* Panel derecho: Asignación en Lote */}
            <div>
              <label className="block text-gray-700 font-bold mb-3">📦 Asignar Múltiples:</label>
              <div className="space-y-3">
                <div>
                  <label className="block text-gray-700 text-sm font-semibold mb-1">Turno</label>
                  <select
                    value={selectedShiftType}
                    onChange={(e) => setSelectedShiftType(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  >
                    {SHIFT_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-gray-700 text-sm font-semibold mb-1">Fecha</label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 text-sm font-semibold mb-2">Empleados:</label>
                  <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-200 rounded p-2 bg-gray-50">
                    {employees.map((e) => (
                      <label key={e.id} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={bulkSelectEmployees.has(e.id)}
                          onChange={(evt) => {
                            const newSet = new Set(bulkSelectEmployees);
                            if (evt.target.checked) {
                              newSet.add(e.id);
                            } else {
                              newSet.delete(e.id);
                            }
                            setBulkSelectEmployees(newSet);
                          }}
                          className="w-4 h-4"
                        />
                        <span className="text-sm">{e.nombre}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <button
                  onClick={handleBulkAssign}
                  disabled={bulkSelectEmployees.size === 0}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold py-2 rounded text-sm"
                >
                  ✓ Asignar {bulkSelectEmployees.size}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Formulario de asignación ANTIGUO */}
      {false && (
        <div className="bg-white shadow-md rounded px-8 py-6 mb-6">
          <div className="grid grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block text-gray-700 font-bold mb-2">Tipo de Turno</label>
              <select
                value={selectedShiftType}
                onChange={(e) => {
                  setSelectedShiftType(e.target.value);
                  setConflictWarning(null);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                {SHIFT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-gray-700 font-bold mb-2">Fecha</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => {
                  setSelectedDate(e.target.value);
                  setConflictWarning(null);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>

            <div>
              <label className="block text-gray-700 font-bold mb-2">Empleado Individual</label>
              <select
                value={selectedEmployeeId}
                onChange={(e) => {
                  const empId = parseInt(e.target.value) || 0;
                  setSelectedEmployeeId(empId);
                  if (empId && selectedDate) {
                    checkConflict(empId, selectedDate);
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value={0}>-- Selecciona empleado --</option>
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={handleCreateAssignment}
                disabled={!selectedEmployeeId || !selectedDate}
                className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-bold py-2 rounded"
              >
                Asignar
              </button>
            </div>
          </div>

          {/* Bulk select */}
          <div className="border-t pt-4 mt-4">
            <label className="block text-gray-700 font-bold mb-3">O Selecciona Múltiples Empleados:</label>
            <div className="grid grid-cols-3 gap-3">
              {employees.map((e) => (
                <label key={e.id} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={bulkSelectEmployees.has(e.id)}
                    onChange={(e) => {
                      const newSet = new Set(bulkSelectEmployees);
                      if (e.target.checked) {
                        newSet.add(parseInt(e.currentTarget.value));
                      } else {
                        newSet.delete(parseInt(e.currentTarget.value));
                      }
                      setBulkSelectEmployees(newSet);
                    }}
                    value={e.id}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">{e.nombre}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Calendario Visual - Grid */}
      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <div className="inline-block min-w-full">
          {/* Header */}
          <div className="grid gap-0 border-b" style={{ gridTemplateColumns: '120px repeat(7, 1fr) repeat(2, 80px)' }}>
            {/* Primera columna: Turnos */}
            <div className="bg-gray-200 p-3 font-bold border-r">Turno</div>

            {/* Días de la semana */}
            {WEEKDAYS.map((day, idx) => (
              <div key={day} className="bg-gray-200 p-3 font-bold border-r text-center text-sm">
                {day}
                <br />
                <span className="text-xs text-gray-600">{weekDateLabels[idx]}</span>
              </div>
            ))}

            {/* Columnas de stats */}
            <div className="bg-gray-200 p-3 font-bold border-r text-xs text-center">Total</div>
            <div className="bg-gray-200 p-3 font-bold text-xs text-center">Asignados</div>
          </div>

          {/* Filas: Cada tipo de turno */}
          {SHIFT_TYPES.map((shiftType) => {
            const shift = shifts.find((s) => s.tipo === shiftType);
            if (!shift) return null;

            return (
              <div key={shiftType} className="grid gap-0 border-b" style={{ gridTemplateColumns: '120px repeat(7, 1fr) repeat(2, 80px)' }}>
                {/* Nombre del turno */}
                <div className="bg-blue-50 p-3 font-semibold border-r text-sm">
                  {shiftType}
                  <br />
                  <span className="text-xs text-gray-600">{shift.start_time}-{shift.end_time}</span>
                </div>

                {/* Celdas por cada día */}
                {weekDates.map((date) => {
                  const dayAssignments = assignments.filter(
                    (a) => a.date === date && shifts.find((s) => s.id === a.shift_id)?.tipo === shiftType
                  );
                  const cellId = `${shiftType}-${date}`;
                  const isHovered = dragOverCell === cellId;

                  return (
                    <div
                      key={cellId}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.dataTransfer!.dropEffect = 'move';
                        handleCellDragOver(shiftType, date);
                      }}
                      onDragLeave={handleCellDragLeave}
                      onDrop={() => handleCellDrop(shiftType, date)}
                      className={`border-r p-2 min-h-20 text-xs relative group transition ${
                        isHovered
                          ? 'bg-yellow-100 ring-2 ring-yellow-400'
                          : 'hover:bg-blue-50'
                      }`}
                    >
                      {/* Indicador visual cuando se arrastra */}
                      {isHovered && (
                        <div className="absolute inset-0 bg-yellow-200 opacity-30 rounded pointer-events-none flex items-center justify-center">
                          <span className="text-yellow-700 font-bold text-xs">↓ Suelta aquí</span>
                        </div>
                      )}

                      {dayAssignments.length > 0 ? (
                        dayAssignments.map((assign) => {
                          const emp = employees.find((e) => e.id === assign.employee_id);
                          return (
                            <div
                              key={assign.id}
                              className="bg-green-100 border border-green-300 rounded p-1 mb-1 cursor-pointer hover:bg-green-200 relative"
                              title={`${emp?.nombre}\nAsignado para ${shiftType}`}
                            >
                              <div className="font-semibold text-xs truncate">{emp?.nombre}</div>
                              <button
                                onClick={() => handleDeleteAssignment(assign.id)}
                                className="absolute top-0 right-0 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                                title="Eliminar"
                              >
                                ✕
                              </button>
                            </div>
                          );
                        })
                      ) : (
                        <div className="text-gray-300 italic">-</div>
                      )}
                    </div>
                  );
                })}

                {/* Stats - Solo Total y Asignados */}
                <div className="bg-gray-50 p-3 border-r text-center font-bold text-sm">
                  {employees.length}
                </div>
                <div className="bg-gray-50 p-3 text-center text-sm">
                  {assignments.filter(
                    (a) => shifts.find((s) => s.id === a.shift_id)?.tipo === shiftType &&
                           weekDates.includes(a.date)
                  ).length}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Horarios de Conductores (Turnos Dinámicos) */}
      {/* SECCIÓN ELIMINADA - Se mueve a ConductorsSchedulePage */}

      {/* Leyenda */}
      <div className="mt-6 p-4 bg-gray-50 rounded border border-gray-300 text-sm">
        <p className="font-bold mb-2">📋 Leyenda:</p>
        <ul className="list-disc list-inside space-y-1 text-gray-700">
          <li>Columna <strong>Total</strong>: Cantidad de empleados activos</li>
          <li>Columna <strong>Asignados</strong>: Turnos asignados esa semana para ese tipo de turno</li>
          <li>Celdas verdes: empleado asignado (hover para ver opciones)</li>
          <li>Celdas vacías: sin empleado asignado para ese turno/día</li>
        </ul>
      </div>
    </div>
  );
}
