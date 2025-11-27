import React, { useState, useEffect } from 'react';
import {
  getEmployees,
  getShifts,
  listAssignments,
  createAssignment,
  deleteAssignment,
  type Employee,
  type Shift,
  type ShiftAssignment,
  type ShiftAssignmentCreate
} from '../../api/rrhh';

export default function CalendarPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [assignments, setAssignments] = useState<ShiftAssignment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const [formData, setFormData] = useState<ShiftAssignmentCreate>({
    employee_id: 0,
    shift_id: 0,
    date: new Date().toISOString().split('T')[0],
    notes: ''
  });

  // Load data on mount
  useEffect(() => {
    loadAllData();
  }, []);

  async function loadAllData() {
    setLoading(true);
    setError(null);
    try {
      const [empData, shiftData, assignData] = await Promise.all([
        getEmployees(),
        getShifts(),
        listAssignments()
      ]);
      setEmployees(empData);
      setShifts(shiftData);
      setAssignments(assignData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar datos');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateAssignment(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!formData.employee_id || !formData.shift_id) {
      setError('Selecciona empleado y turno');
      return;
    }

    try {
      await createAssignment(formData);
      setFormData({
        employee_id: 0,
        shift_id: 0,
        date: new Date().toISOString().split('T')[0],
        notes: ''
      });
      setShowForm(false);
      await loadAllData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear asignación');
    }
  }

  async function handleDeleteAssignment(id: number) {
    if (!confirm('¿Eliminar esta asignación?')) return;

    try {
      await deleteAssignment(id);
      await loadAllData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar asignación');
    }
  }

  // Helper to get employee/shift names by ID
  const getEmployeeName = (id: number) => employees.find((e) => e.id === id)?.nombre || `Empleado #${id}`;
  const getShiftName = (id: number) => shifts.find((s) => s.id === id)?.tipo || `Turno #${id}`;

  return (
    <div className="p-6">
      <h2 className="text-3xl font-bold mb-6">Calendario de Asignaciones</h2>

      {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">{error}</div>}

      <button
        className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded mb-4"
        onClick={() => setShowForm(!showForm)}
      >
        {showForm ? 'Cancelar' : '+ Nueva Asignación'}
      </button>

      {showForm && (
        <form onSubmit={handleCreateAssignment} className="bg-white shadow-md rounded px-8 py-6 mb-6">
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="employee_id">
              Empleado
            </label>
            <select
              id="employee_id"
              value={formData.employee_id}
              onChange={(e) =>
                setFormData({ ...formData, employee_id: parseInt(e.target.value) || 0 })
              }
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring focus:ring-blue-500"
            >
              <option value={0}>-- Selecciona un empleado --</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.nombre} ({emp.rut || 'sin RUT'})
                </option>
              ))}
            </select>
          </div>

          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="shift_id">
              Turno
            </label>
            <select
              id="shift_id"
              value={formData.shift_id}
              onChange={(e) =>
                setFormData({ ...formData, shift_id: parseInt(e.target.value) || 0 })
              }
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring focus:ring-blue-500"
            >
              <option value={0}>-- Selecciona un turno --</option>
              {shifts.map((shift) => (
                <option key={shift.id} value={shift.id}>
                  {shift.tipo} ({shift.start_time} - {shift.end_time})
                </option>
              ))}
            </select>
          </div>

          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="date">
              Fecha
            </label>
            <input
              id="date"
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring focus:ring-blue-500"
            />
          </div>

          <div className="mb-6">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="notes">
              Notas (opcional)
            </label>
            <textarea
              id="notes"
              value={formData.notes || ''}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Notas adicionales sobre esta asignación"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring focus:ring-blue-500"
            />
          </div>

          <button type="submit" className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded">
            Crear Asignación
          </button>
        </form>
      )}

      {loading ? (
        <div className="text-center py-8">Cargando asignaciones...</div>
      ) : assignments.length === 0 ? (
        <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded">
          No hay asignaciones registradas
        </div>
      ) : (
        <div className="overflow-x-auto bg-white rounded-lg shadow">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Empleado</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Turno</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Notas</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {assignments.map((assign) => (
                <tr key={assign.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{assign.id}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{getEmployeeName(assign.employee_id)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{getShiftName(assign.shift_id)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{assign.date}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{assign.notes || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <button
                      className="bg-red-600 hover:bg-red-700 text-white font-bold py-1 px-3 rounded text-xs"
                      onClick={() => handleDeleteAssignment(assign.id)}
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
