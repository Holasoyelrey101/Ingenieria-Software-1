import React, { useState, useEffect } from 'react';
import {
  getEmployees,
  getShifts,
  listAssignments,
  getEmployeeTrainings,
  createEmployee,
  updateEmployee,
  type Employee,
  type Shift,
  type ShiftAssignment,
  type EmployeeTraining,
  type EmployeeCreate
} from '../../api/rrhh';

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [assignments, setAssignments] = useState<ShiftAssignment[]>([]);
  const [employeeTrainings, setEmployeeTrainings] = useState<EmployeeTraining[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'proximos' | 'capacitaciones' | 'historial'>('proximos');

  // Formulario de empleado
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<EmployeeCreate>({ nombre: '', email: '', rut: '' });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Búsqueda y filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');

  // Load data
  useEffect(() => {
    loadAllData();
  }, []);

  // Validaciones
  const validateEmail = (email: string): string | null => {
    if (!email) return null;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return 'Email inválido (debe contener @)';
    }
    return null;
  };

  const validateRut = (rut: string): string | null => {
    if (!rut) return null;
    // Remove dots and hyphens for validation
    const cleanRut = rut.replace(/[.-]/g, '');
    if (cleanRut.length < 7 || cleanRut.length > 9) {
      return 'RUT debe tener 7-9 dígitos';
    }
    if (!/^\d{7,9}[kK0-9]?$/.test(cleanRut)) {
      return 'RUT inválido (debe contener solo números y opcionalmente K)';
    }
    return null;
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.nombre.trim()) {
      errors.nombre = 'El nombre es requerido';
    }

    const emailError = validateEmail(formData.email || '');
    if (emailError) errors.email = emailError;

    const rutError = validateRut(formData.rut || '');
    if (rutError) errors.rut = rutError;

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleFormChange = (field: keyof EmployeeCreate, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setFormErrors((prev) => ({ ...prev, [field]: '' }));

    // Real-time validation
    if (field === 'email') {
      const err = validateEmail(value);
      if (err) setFormErrors((prev) => ({ ...prev, email: err }));
    }
    if (field === 'rut') {
      const err = validateRut(value);
      if (err) setFormErrors((prev) => ({ ...prev, rut: err }));
    }
  };

  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      await createEmployee(formData);
      setFormData({ nombre: '', email: '', rut: '' });
      setShowForm(false);
      setFormErrors({});
      await loadAllData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear empleado');
    }
  };

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

  // Cargar entrenamientos del empleado seleccionado
  const loadEmployeeTrainings = async (empId: number) => {
    try {
      const trainings = await getEmployeeTrainings(empId);
      setEmployeeTrainings(trainings);
    } catch (err) {
      console.error('Error loading trainings:', err);
    }
  };

  const selectedEmployee = employees.find((e) => e.id === selectedEmployeeId);

  // Obtener próximos turnos del empleado
  const getUpcomingShifts = (empId: number) => {
    const today = new Date();
    return assignments
      .filter((a) => a.employee_id === empId && new Date(a.date) >= today)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(0, 5)
      .map((a) => ({
        ...a,
        shift: shifts.find((s) => s.id === a.shift_id)
      }));
  };

  // Obtener historial (últimos 30 días)
  const getShiftHistory = (empId: number) => {
    const today = new Date();
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    return assignments
      .filter((a) => a.employee_id === empId && new Date(a.date) >= thirtyDaysAgo)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .map((a) => ({
        ...a,
        shift: shifts.find((s) => s.id === a.shift_id)
      }));
  };

  // Obtener capacitaciones pendientes
  const getPendingTrainings = () => {
    return employeeTrainings.filter((t) => t.status === 'PENDING');
  };

  // Filtrar y buscar empleados
  const getFilteredEmployees = () => {
    return employees.filter((emp) => {
      // Filtro por estado
      if (filterStatus === 'active' && !emp.activo) return false;
      if (filterStatus === 'inactive' && emp.activo) return false;

      // Búsqueda por nombre o email o RUT
      const search = searchTerm.toLowerCase();
      const matchName = emp.nombre.toLowerCase().includes(search);
      const matchEmail = emp.email?.toLowerCase().includes(search);
      const matchRut = emp.rut?.includes(search);

      return matchName || matchEmail || matchRut;
    });
  };

  const filteredEmployees = getFilteredEmployees();

  if (loading && employees.length === 0) {
    return <div className="p-6 text-center">Cargando empleados...</div>;
  }

  return (
    <div className="p-6">
      <h2 className="text-3xl font-bold mb-6">👥 Gestión de Empleados</h2>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* Botón para agregar empleado */}
      <button
        onClick={() => setShowForm(!showForm)}
        className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded mb-4 transition"
      >
        {showForm ? '✕ Cancelar' : '+ Nuevo Empleado'}
      </button>

      {/* Formulario de empleado con validación inline */}
      {showForm && (
        <form onSubmit={handleCreateEmployee} className="bg-white shadow-md rounded px-6 py-4 mb-6 space-y-4">
          <h3 className="font-bold text-lg mb-4">Agregar Nuevo Empleado</h3>

          <div>
            <label className="block text-gray-700 font-semibold mb-2">Nombre *</label>
            <input
              type="text"
              value={formData.nombre}
              onChange={(e) => handleFormChange('nombre', e.target.value)}
              className={`w-full px-3 py-2 border rounded transition ${
                formErrors.nombre ? 'border-red-500 bg-red-50' : 'border-gray-300'
              }`}
              placeholder="Ej: Juan Pérez"
            />
            {formErrors.nombre && (
              <p className="text-red-600 text-sm mt-1">❌ {formErrors.nombre}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-700 font-semibold mb-2">Email</label>
              <input
                type="email"
                value={formData.email || ''}
                onChange={(e) => handleFormChange('email', e.target.value)}
                className={`w-full px-3 py-2 border rounded transition ${
                  formErrors.email ? 'border-red-500 bg-red-50' : 'border-gray-300'
                }`}
                placeholder="Ej: juan@example.com"
              />
              {formErrors.email && (
                <p className="text-red-600 text-sm mt-1">❌ {formErrors.email}</p>
              )}
              {formData.email && !formErrors.email && (
                <p className="text-green-600 text-sm mt-1">✓ Email válido</p>
              )}
            </div>

            <div>
              <label className="block text-gray-700 font-semibold mb-2">RUT</label>
              <input
                type="text"
                value={formData.rut || ''}
                onChange={(e) => handleFormChange('rut', e.target.value)}
                className={`w-full px-3 py-2 border rounded transition ${
                  formErrors.rut ? 'border-red-500 bg-red-50' : 'border-gray-300'
                }`}
                placeholder="Ej: 12345678-9"
              />
              {formErrors.rut && (
                <p className="text-red-600 text-sm mt-1">❌ {formErrors.rut}</p>
              )}
              {formData.rut && !formErrors.rut && (
                <p className="text-green-600 text-sm mt-1">✓ RUT válido</p>
              )}
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <button
              type="submit"
              className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-2 rounded transition"
            >
              ✓ Guardar Empleado
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setFormData({ nombre: '', email: '', rut: '' });
                setFormErrors({});
              }}
              className="flex-1 bg-gray-400 hover:bg-gray-500 text-white font-bold py-2 rounded transition"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Panel Izquierdo: Lista de Empleados */}
        <div className="lg:col-span-1 bg-white rounded-lg shadow p-4">
          <h3 className="text-xl font-bold mb-4">Empleados ({filteredEmployees.length})</h3>

          {/* Búsqueda */}
          <div className="mb-4">
            <input
              type="text"
              placeholder="🔍 Buscar por nombre, email o RUT..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
          </div>

          {/* Filtros */}
          <div className="mb-4 flex gap-2">
            {(['all', 'active', 'inactive'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-3 py-1 rounded text-sm font-semibold transition ${
                  filterStatus === status
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {status === 'all' && '📋 Todos'}
                {status === 'active' && '✓ Activos'}
                {status === 'inactive' && '✗ Inactivos'}
              </button>
            ))}
          </div>

          {/* Lista de empleados */}
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {filteredEmployees.length === 0 ? (
              <p className="text-gray-500 text-sm italic">
                {searchTerm || filterStatus !== 'all' ? 'No hay empleados que coincidan' : 'No hay empleados'}
              </p>
            ) : (
              filteredEmployees.map((emp) => (
                <button
                  key={emp.id}
                  onClick={() => {
                    setSelectedEmployeeId(emp.id);
                    setActiveTab('proximos');
                    loadEmployeeTrainings(emp.id);
                  }}
                  className={`w-full text-left p-3 rounded transition ${
                    selectedEmployeeId === emp.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-800'
                  }`}
                >
                  <div className="font-semibold">{emp.nombre}</div>
                  <div className="text-xs opacity-75">{emp.rut || 'Sin RUT'}</div>
                  <div className={`text-xs ${emp.activo ? 'text-green-600' : 'text-red-600'}`}>
                    {emp.activo ? '✓ Activo' : '✗ Inactivo'}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Panel Derecho: Detalles del Empleado */}
        <div className="lg:col-span-2">
          {selectedEmployee ? (
            <div className="bg-white rounded-lg shadow p-6">
              {/* Header del Empleado */}
              <div className="mb-6 pb-4 border-b">
                <h3 className="text-2xl font-bold">{selectedEmployee.nombre}</h3>
                <div className="grid grid-cols-2 gap-4 mt-3 text-sm text-gray-600">
                  <div>
                    <span className="font-semibold">RUT:</span> {selectedEmployee.rut || '-'}
                  </div>
                  <div>
                    <span className="font-semibold">Email:</span> {selectedEmployee.email || '-'}
                  </div>
                  <div>
                    <span className="font-semibold">Estado:</span>{' '}
                    <span className={selectedEmployee.activo ? 'text-green-600' : 'text-red-600'}>
                      {selectedEmployee.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </div>
                  <div>
                    <span className="font-semibold">Turnos esta semana:</span>{' '}
                    {assignments.filter(
                      (a) =>
                        a.employee_id === selectedEmployee.id &&
                        new Date(a.date) >= new Date() &&
                        new Date(a.date) < new Date(new Date().getTime() + 7 * 24 * 60 * 60 * 1000)
                    ).length}
                  </div>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex gap-4 mb-6 border-b">
                {['proximos', 'capacitaciones', 'historial'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab as typeof activeTab)}
                    className={`px-4 py-2 font-semibold transition ${
                      activeTab === tab
                        ? 'border-b-2 border-blue-600 text-blue-600'
                        : 'text-gray-600 hover:text-gray-800'
                    }`}
                  >
                    {tab === 'proximos' && '📅 Próximos Turnos'}
                    {tab === 'capacitaciones' && '🎓 Capacitaciones'}
                    {tab === 'historial' && '📊 Historial'}
                  </button>
                ))}
              </div>

              {/* Contenido de Tabs */}
              {activeTab === 'proximos' && (
                <div>
                  <h4 className="font-bold mb-3">Próximos 5 Turnos</h4>
                  {getUpcomingShifts(selectedEmployee.id).length === 0 ? (
                    <p className="text-gray-500">No hay turnos asignados próximamente</p>
                  ) : (
                    <div className="space-y-2">
                      {getUpcomingShifts(selectedEmployee.id).map((assign) => (
                        <div
                          key={assign.id}
                          className="p-3 bg-blue-50 border border-blue-200 rounded flex justify-between items-center"
                        >
                          <div>
                            <div className="font-semibold">{assign.shift?.tipo}</div>
                            <div className="text-sm text-gray-600">
                              {new Date(assign.date).toLocaleDateString('es-CL')} •{' '}
                              {assign.shift?.start_time}-{assign.shift?.end_time}
                            </div>
                            {assign.notes && (
                              <div className="text-xs text-gray-500 mt-1">Nota: {assign.notes}</div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'capacitaciones' && (
                <div>
                  <h4 className="font-bold mb-3">Capacitaciones</h4>
                  {employeeTrainings.length === 0 ? (
                    <p className="text-gray-500">Sin capacitaciones registradas</p>
                  ) : (
                    <>
                      {getPendingTrainings().length > 0 && (
                        <div className="mb-4">
                          <h5 className="font-semibold text-orange-600 mb-2">⚠️ Pendientes</h5>
                          <div className="space-y-2">
                            {getPendingTrainings().map((training) => (
                              <div
                                key={training.id}
                                className="p-3 bg-orange-50 border border-orange-200 rounded"
                              >
                                <div className="font-semibold">{training.training_id}</div>
                                <div className="text-sm text-gray-600">
                                  Programada: {new Date(training.date).toLocaleDateString('es-CL')}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <h5 className="font-semibold text-green-600 mb-2">✓ Completadas</h5>
                      <div className="space-y-2">
                        {employeeTrainings
                          .filter((t) => t.status === 'COMPLETED')
                          .map((training) => (
                            <div
                              key={training.id}
                              className="p-3 bg-green-50 border border-green-200 rounded"
                            >
                              <div className="font-semibold">{training.training_id}</div>
                              <div className="text-sm text-gray-600">
                                Fecha: {new Date(training.date).toLocaleDateString('es-CL')} •
                                Instructor: {training.instructor || '-'}
                              </div>
                              {training.certificate_url && (
                                <a
                                  href={training.certificate_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-blue-600 hover:underline mt-1 block"
                                >
                                  📄 Ver Certificado
                                </a>
                              )}
                            </div>
                          ))}
                      </div>
                    </>
                  )}
                </div>
              )}

              {activeTab === 'historial' && (
                <div>
                  <h4 className="font-bold mb-3">Historial (Últimos 30 días)</h4>
                  {getShiftHistory(selectedEmployee.id).length === 0 ? (
                    <p className="text-gray-500">Sin turnos en el historial</p>
                  ) : (
                    <div className="space-y-2">
                      {getShiftHistory(selectedEmployee.id).map((assign) => (
                        <div
                          key={assign.id}
                          className="p-3 bg-gray-50 border border-gray-200 rounded flex justify-between items-center"
                        >
                          <div>
                            <div className="font-semibold">{assign.shift?.tipo}</div>
                            <div className="text-sm text-gray-600">
                              {new Date(assign.date).toLocaleDateString('es-CL')} •{' '}
                              {assign.shift?.start_time}-{assign.shift?.end_time}
                            </div>
                          </div>
                          <div className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                            ✓ Completado
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow p-6 text-center text-gray-500">
              Selecciona un empleado para ver detalles
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
