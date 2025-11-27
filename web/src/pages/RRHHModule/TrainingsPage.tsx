import React, { useState, useEffect } from 'react';
import {
  getTrainings,
  createTraining,
  deleteTraining,
  getEmployees,
  assignTraining,
  getEmployeeTrainings,
  type Training,
  type TrainingCreate,
  type Employee,
  type EmployeeTraining
} from '../../api/rrhh';

export default function TrainingsPage() {
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [assignedTrainings, setAssignedTrainings] = useState<EmployeeTraining[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'capacitaciones' | 'assignments'>('capacitaciones');

  const [trainingFormData, setTrainingFormData] = useState<TrainingCreate>({
    title: '',
    topic: '',
    required: false
  });

  const [assignmentFormData, setAssignmentFormData] = useState({
    employee_id: 0,
    training_id: 0,
    date: new Date().toISOString().split('T')[0],
    instructor: '',
    status: 'COMPLETED'
  });

  const [showTrainingForm, setShowTrainingForm] = useState(false);
  const [showAssignmentForm, setShowAssignmentForm] = useState(false);

  // Load data on mount
  useEffect(() => {
    loadAllData();
  }, []);

  async function loadAllData() {
    setLoading(true);
    setError(null);
    try {
      const trainData = await getTrainings();
      const empData = await getEmployees();
      
      // Load all assigned trainings
      const allAssigned: EmployeeTraining[] = [];
      for (const emp of empData) {
        try {
          const empTrainings = await getEmployeeTrainings(emp.id);
          allAssigned.push(...empTrainings);
        } catch (err) {
          // Employee may not have trainings
        }
      }
      
      setTrainings(trainData);
      setEmployees(empData);
      setAssignedTrainings(allAssigned);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar datos');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateTraining(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    try {
      await createTraining(trainingFormData);
      setTrainingFormData({ title: '', topic: '', required: false });
      setShowTrainingForm(false);
      await loadAllData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear capacitación');
    }
  }

  async function handleDeleteTraining(id: number) {
    if (!confirm('¿Eliminar esta capacitación?')) return;

    try {
      await deleteTraining(id);
      await loadAllData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar capacitación');
    }
  }

  async function handleAssignTraining(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!assignmentFormData.employee_id || !assignmentFormData.training_id) {
      setError('Selecciona empleado y capacitación');
      return;
    }

    try {
      await assignTraining({
        employee_id: assignmentFormData.employee_id,
        training_id: assignmentFormData.training_id,
        date: assignmentFormData.date,
        instructor: assignmentFormData.instructor || undefined,
        status: assignmentFormData.status
      });
      setAssignmentFormData({
        employee_id: 0,
        training_id: 0,
        date: new Date().toISOString().split('T')[0],
        instructor: '',
        status: 'COMPLETED'
      });
      setShowAssignmentForm(false);
      await loadAllData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al asignar capacitación');
    }
  }

  const getEmployeeName = (id: number) => employees.find((e) => e.id === id)?.nombre || `Empleado #${id}`;
  const getTrainingTitle = (id: number) => trainings.find((t) => t.id === id)?.title || `Capacitación #${id}`;

  return (
    <div className="p-6">
      <h2 className="text-3xl font-bold mb-6">🎓 Gestión de Capacitaciones</h2>

      {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">{error}</div>}

      {/* Tabs */}
      <div className="flex border-b border-gray-300 mb-6">
        <button
          className={`py-2 px-4 font-medium ${
            activeTab === 'capacitaciones'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-800'
          }`}
          onClick={() => setActiveTab('capacitaciones')}
        >
          Capacitaciones
        </button>
        <button
          className={`py-2 px-4 font-medium ${
            activeTab === 'assignments'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-800'
          }`}
          onClick={() => setActiveTab('assignments')}
        >
          Asignaciones
        </button>
      </div>

      {/* Capacitaciones Tab */}
      {activeTab === 'capacitaciones' && (
        <>
          <button
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded mb-4"
            onClick={() => setShowTrainingForm(!showTrainingForm)}
          >
            {showTrainingForm ? 'Cancelar' : '+ Nueva Capacitación'}
          </button>

          {showTrainingForm && (
            <form onSubmit={handleCreateTraining} className="bg-white shadow-md rounded px-8 py-6 mb-6">
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="title">
                  Título de la Capacitación
                </label>
                <input
                  id="title"
                  type="text"
                  value={trainingFormData.title}
                  onChange={(e) =>
                    setTrainingFormData({ ...trainingFormData, title: e.target.value })
                  }
                  placeholder="ej: Python Basics"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring focus:ring-blue-500"
                />
              </div>

              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="topic">
                  Tema
                </label>
                <input
                  id="topic"
                  type="text"
                  value={trainingFormData.topic || ''}
                  onChange={(e) =>
                    setTrainingFormData({ ...trainingFormData, topic: e.target.value })
                  }
                  placeholder="ej: Programming"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring focus:ring-blue-500"
                />
              </div>

              <div className="mb-6">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={trainingFormData.required || false}
                    onChange={(e) =>
                      setTrainingFormData({ ...trainingFormData, required: e.target.checked })
                    }
                    className="w-4 h-4 text-blue-600"
                  />
                  <span className="ml-2 text-gray-700">Requerido</span>
                </label>
              </div>

              <button type="submit" className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded">
                Guardar Capacitación
              </button>
            </form>
          )}

          {loading ? (
            <div className="text-center py-8">Cargando capacitaciones...</div>
          ) : trainings.length === 0 ? (
            <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded">
              No hay capacitaciones registradas
            </div>
          ) : (
            <div className="overflow-x-auto bg-white rounded-lg shadow">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Título</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tema</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Requerida</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {trainings.map((training) => (
                    <tr key={training.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{training.id}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{training.title}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{training.topic || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{training.required ? 'Sí' : 'No'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button
                          className="bg-red-600 hover:bg-red-700 text-white font-bold py-1 px-3 rounded text-xs"
                          onClick={() => handleDeleteTraining(training.id)}
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
        </>
      )}

      {/* Assignments Tab */}
      {activeTab === 'assignments' && (
        <>
          <button
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded mb-4"
            onClick={() => setShowAssignmentForm(!showAssignmentForm)}
          >
            {showAssignmentForm ? 'Cancelar' : '+ Nueva Asignación'}
          </button>

          {showAssignmentForm && (
            <form onSubmit={handleAssignTraining} className="bg-white shadow-md rounded px-8 py-6 mb-6">
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="emp_id">
                  Empleado
                </label>
                <select
                  id="emp_id"
                  value={assignmentFormData.employee_id}
                  onChange={(e) =>
                    setAssignmentFormData({
                      ...assignmentFormData,
                      employee_id: parseInt(e.target.value) || 0
                    })
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
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="train_id">
                  Capacitación
                </label>
                <select
                  id="train_id"
                  value={assignmentFormData.training_id}
                  onChange={(e) =>
                    setAssignmentFormData({
                      ...assignmentFormData,
                      training_id: parseInt(e.target.value) || 0
                    })
                  }
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring focus:ring-blue-500"
                >
                  <option value={0}>-- Selecciona una capacitación --</option>
                  {trainings.map((training) => (
                    <option key={training.id} value={training.id}>
                      {training.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="assign_date">
                  Fecha de Completación
                </label>
                <input
                  id="assign_date"
                  type="date"
                  value={assignmentFormData.date}
                  onChange={(e) =>
                    setAssignmentFormData({ ...assignmentFormData, date: e.target.value })
                  }
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring focus:ring-blue-500"
                />
              </div>

              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="instructor">
                  Instructor
                </label>
                <input
                  id="instructor"
                  type="text"
                  value={assignmentFormData.instructor}
                  onChange={(e) =>
                    setAssignmentFormData({ ...assignmentFormData, instructor: e.target.value })
                  }
                  placeholder="Nombre del instructor"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring focus:ring-blue-500"
                />
              </div>

              <div className="mb-6">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="status">
                  Estado
                </label>
                <select
                  id="status"
                  value={assignmentFormData.status}
                  onChange={(e) =>
                    setAssignmentFormData({ ...assignmentFormData, status: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring focus:ring-blue-500"
                >
                  <option value="COMPLETED">Completado</option>
                  <option value="IN_PROGRESS">En Progreso</option>
                  <option value="PENDING">Pendiente</option>
                </select>
              </div>

              <button type="submit" className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded">
                Asignar Capacitación
              </button>
            </form>
          )}

          {loading ? (
            <div className="text-center py-8">Cargando asignaciones...</div>
          ) : assignedTrainings.length === 0 ? (
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
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Capacitación</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Instructor</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {assignedTrainings.map((assign) => (
                    <tr key={assign.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{assign.id}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{getEmployeeName(assign.employee_id)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{getTrainingTitle(assign.training_id)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{assign.date}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{assign.instructor || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{assign.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
