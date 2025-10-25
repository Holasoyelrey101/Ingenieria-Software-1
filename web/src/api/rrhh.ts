// RR.HH. API Client
// Connects to ms-rrhh microservice (localhost:8003 in dev, configurable via VITE_API_RRHH)

const API_RRHH = import.meta.env.VITE_API_RRHH || 'http://localhost:8003';

// ========== Types ==========

export type Employee = {
  id: number;
  nombre: string;
  email?: string;
  rut?: string;
  activo: boolean;
};

export type EmployeeCreate = {
  nombre: string;
  email?: string;
  rut?: string;
};

export type Shift = {
  id: number;
  tipo: string; // 'Mañana' | 'Tarde' | 'Noche'
  start_time: string; // HH:MM:SS
  end_time: string;   // HH:MM:SS
  timezone: string;   // 'America/Santiago'
};

export type ShiftCreate = {
  tipo: string; // 'Mañana' | 'Tarde' | 'Noche'
  start_time: string;
  end_time: string;
  timezone: string;   // 'America/Santiago'
};

export type ShiftAssignment = {
  id: number;
  employee_id: number;
  shift_id: number;
  date: string; // YYYY-MM-DD
  notes?: string;
};

export type ShiftAssignmentCreate = {
  employee_id: number;
  shift_id: number;
  date: string;
  notes?: string;
};

// ========== Employees ==========

export async function getEmployees(): Promise<Employee[]> {
  const res = await fetch(`${API_RRHH}/employees`);
  if (!res.ok) throw new Error('Error al cargar empleados');
  return res.json();
}

export async function getEmployee(id: number): Promise<Employee> {
  const res = await fetch(`${API_RRHH}/employees/${id}`);
  if (!res.ok) {
    if (res.status === 404) throw new Error('Empleado no encontrado');
    throw new Error('Error al cargar empleado');
  }
  return res.json();
}

export async function createEmployee(data: EmployeeCreate): Promise<Employee> {
  const res = await fetch(`${API_RRHH}/employees`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(`Error al crear empleado: ${err.detail?.[0]?.msg || err.detail}`);
  }
  return res.json();
}

export async function updateEmployee(id: number, data: Partial<EmployeeCreate>): Promise<Employee> {
  const res = await fetch(`${API_RRHH}/employees/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    if (res.status === 404) throw new Error('Empleado no encontrado');
    throw new Error('Error al actualizar empleado');
  }
  return res.json();
}

export async function deleteEmployee(id: number): Promise<void> {
  const res = await fetch(`${API_RRHH}/employees/${id}`, { method: 'DELETE' });
  if (!res.ok) {
    if (res.status === 404) throw new Error('Empleado no encontrado');
    throw new Error('Error al eliminar empleado');
  }
}

// ========== Shifts ==========

export async function getShifts(): Promise<Shift[]> {
  const res = await fetch(`${API_RRHH}/shifts`);
  if (!res.ok) throw new Error('Error al cargar turnos');
  return res.json();
}

export async function getShift(id: number): Promise<Shift> {
  const res = await fetch(`${API_RRHH}/shifts/${id}`);
  if (!res.ok) {
    if (res.status === 404) throw new Error('Turno no encontrado');
    throw new Error('Error al cargar turno');
  }
  return res.json();
}

export async function createShift(data: ShiftCreate): Promise<Shift> {
  const res = await fetch(`${API_RRHH}/shifts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(`Error al crear turno: ${err.detail?.[0]?.msg || err.detail}`);
  }
  return res.json();
}

export async function updateShift(id: number, data: Partial<ShiftCreate>): Promise<Shift> {
  const res = await fetch(`${API_RRHH}/shifts/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    if (res.status === 404) throw new Error('Turno no encontrado');
    throw new Error('Error al actualizar turno');
  }
  return res.json();
}

export async function deleteShift(id: number): Promise<void> {
  const res = await fetch(`${API_RRHH}/shifts/${id}`, { method: 'DELETE' });
  if (!res.ok) {
    if (res.status === 404) throw new Error('Turno no encontrado');
    throw new Error('Error al eliminar turno');
  }
}

// ========== Shift Assignments ==========

export async function listAssignments(params?: {
  employee_id?: number;
  from?: string; // YYYY-MM-DD
  to?: string;   // YYYY-MM-DD
}): Promise<ShiftAssignment[]> {
  const url = new URL(`${API_RRHH}/assignments`);
  if (params?.employee_id) url.searchParams.set('employee_id', params.employee_id.toString());
  if (params?.from) url.searchParams.set('from', params.from);
  if (params?.to) url.searchParams.set('to', params.to);

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error('Error al cargar asignaciones');
  return res.json();
}

export async function getAssignment(id: number): Promise<ShiftAssignment> {
  const res = await fetch(`${API_RRHH}/assignments/${id}`);
  if (!res.ok) {
    if (res.status === 404) throw new Error('Asignación no encontrada');
    throw new Error('Error al cargar asignación');
  }
  return res.json();
}

export async function createAssignment(data: ShiftAssignmentCreate): Promise<ShiftAssignment> {
  const res = await fetch(`${API_RRHH}/assignments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    const err = await res.json();
    if (res.status === 409) {
      throw new Error('Este empleado ya tiene un turno asignado en esta fecha');
    }
    throw new Error(`Error al crear asignación: ${err.detail?.[0]?.msg || err.detail}`);
  }
  return res.json();
}

export async function deleteAssignment(id: number): Promise<void> {
  const res = await fetch(`${API_RRHH}/assignments/${id}`, { method: 'DELETE' });
  if (!res.ok) {
    if (res.status === 404) throw new Error('Asignación no encontrada');
    throw new Error('Error al eliminar asignación');
  }
}

// ========== Trainings (for HU10) ==========

export type Training = {
  id: number;
  title: string;
  topic?: string;
  required?: boolean;
};

export type TrainingCreate = {
  title: string;
  topic?: string;
  required?: boolean;
};

export type EmployeeTraining = {
  id: number;
  employee_id: number;
  training_id: number;
  date: string; // YYYY-MM-DD
  instructor?: string;
  status?: string;
  certificate_url?: string;
  notes?: string;
};

export type EmployeeTrainingCreate = {
  employee_id: number;
  training_id: number;
  date: string;
  instructor?: string;
  status?: string;
  certificate_url?: string;
  notes?: string;
};

export async function getTrainings(): Promise<Training[]> {
  const res = await fetch(`${API_RRHH}/trainings`);
  if (!res.ok) throw new Error('Error al cargar entrenamientos');
  return res.json();
}

export async function createTraining(data: TrainingCreate): Promise<Training> {
  const res = await fetch(`${API_RRHH}/trainings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Error al crear entrenamiento');
  return res.json();
}

export async function deleteTraining(id: number): Promise<void> {
  const res = await fetch(`${API_RRHH}/trainings/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Error al eliminar entrenamiento');
}

export async function getEmployeeTrainings(employeeId: number): Promise<EmployeeTraining[]> {
  const res = await fetch(`${API_RRHH}/employees/${employeeId}/trainings`);
  if (!res.ok) throw new Error('Error al cargar entrenamientos del empleado');
  return res.json();
}

export async function assignTraining(data: EmployeeTrainingCreate): Promise<EmployeeTraining> {
  const res = await fetch(`${API_RRHH}/employee-trainings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Error al asignar entrenamiento');
  return res.json();
}

// ========== Assignment Suggestions ==========

export type SuggestionsData = {
  unassigned_employees: Array<{
    id: number;
    nombre: string;
    email?: string;
    assignments_this_week: number;
  }>;
  uncovered_shifts: Array<{
    date: string;
    weekday: string;
    shift_tipo: string;
    shift_id: number;
    start_time: string;
    end_time: string;
    assigned_count: number;
    minimum_needed: number;
  }>;
  week_start: string;
  week_end: string;
  total_employees: number;
  total_shifts: number;
  total_assignments_this_week: number;
};

export async function getWeeklySuggestions(): Promise<SuggestionsData> {
  const res = await fetch(`${API_RRHH}/assignments/suggestions/weekly`);
  if (!res.ok) throw new Error('Error al cargar sugerencias');
  return res.json();
}

// ========== Dynamic Shifts (Turnos Dinámicos) ==========

export type DynamicShift = {
  id: number;
  route_id: number;
  fecha_programada: string; // YYYY-MM-DD
  hora_inicio: string; // HH:MM:SS
  duracion_minutos: number;
  conduccion_continua_minutos: number;
  status: string;
  created_at: string;
  assigned_at?: string;
  completed_at?: string;
  assignments?: DynamicShiftAssignment[];
};

export type DynamicShiftAssignment = {
  id: number;
  dynamic_shift_id: number;
  employee_id: number;
  role_in_shift: string; // 'conductor', 'asistente', 'custodia'
  assigned_at: string;
  started_at?: string;
  completed_at?: string;
  status: string;
};

export type AvailableDriver = {
  employee_id: number;
  nombre: string;
  email: string;
  horas_conduccion_hoy: number;
  puede_asignarse: boolean;
  razon_no_disponible?: string;
};

export async function getAvailableDrivers(dynamicShiftId: number): Promise<AvailableDriver[]> {
  const res = await fetch(`${API_RRHH}/dynamic-shifts/available-drivers/${dynamicShiftId}`);
  if (!res.ok) throw new Error('Error al cargar conductores disponibles');
  return res.json();
}

export async function autoAssignDriver(dynamicShiftId: number, employeeId: number): Promise<DynamicShift> {
  const url = new URL(`${API_RRHH}/dynamic-shifts/${dynamicShiftId}/auto-assign`);
  url.searchParams.set('employee_id', employeeId.toString());
  
  const res = await fetch(url.toString(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(`Error al asignar conductor: ${err.detail}`);
  }
  return res.json();
}

export async function unassignDriver(dynamicShiftId: number): Promise<DynamicShift> {
  const res = await fetch(`${API_RRHH}/dynamic-shifts/${dynamicShiftId}/unassign`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' }
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(`Error al desasignar conductor: ${err.detail}`);
  }
  return res.json();
}

export async function getPendingDynamicShifts(): Promise<DynamicShift[]> {
  const res = await fetch(`${API_RRHH}/dynamic-shifts/pending/unassigned`);
  if (!res.ok) throw new Error('Error al cargar turnos pendientes');
  return res.json();
}

export async function getDynamicShift(id: number): Promise<DynamicShift> {
  const res = await fetch(`${API_RRHH}/dynamic-shifts/${id}`);
  if (!res.ok) throw new Error('Error al cargar turno dinámico');
  return res.json();
}

export async function listDynamicShifts(params?: {
  fecha_desde?: string;
  fecha_hasta?: string;
  status?: string;
}): Promise<DynamicShift[]> {
  const url = new URL(`${API_RRHH}/dynamic-shifts`);
  if (params?.fecha_desde) url.searchParams.set('fecha_desde', params.fecha_desde);
  if (params?.fecha_hasta) url.searchParams.set('fecha_hasta', params.fecha_hasta);
  if (params?.status) url.searchParams.set('status', params.status);

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error('Error al cargar turnos dinámicos');
  return res.json();
}

