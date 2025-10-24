const API_INV = import.meta.env.VITE_API_INVENTARIO;

export interface MaintenanceTask {
  id: number;
  title: string;
  description: string;
  status: 'pendiente' | 'en_progreso' | 'completada';
  created_at: string;
  due_date: string | null;
  asset_name: string;
  task_type: string;
  technician_assigned?: string;
}

export interface MaintenanceStats {
  total: number;
  pending: number;
  in_progress: number;
  completed: number;
}

export interface Asset {
  id: number;
  name: string;
  model: string;
  brand: string;
  location: string;
}

class MaintenanceAPI {
  private async fetchAPI(endpoint: string, options: RequestInit = {}) {
    const url = `${API_INV}${endpoint}`;
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async getTasks(status?: string): Promise<MaintenanceTask[]> {
    const params = status && status !== 'all' ? `?status=${status}` : '';
    return this.fetchAPI(`/maintenance/tasks${params}`);
  }

  async createTask(task: {
    title: string;
    description: string;
    asset_id: number;
    due_date?: string;
    task_type: string;
  }): Promise<MaintenanceTask> {
    return this.fetchAPI('/maintenance/tasks', {
      method: 'POST',
      body: JSON.stringify(task),
    });
  }

  async updateTask(taskId: number, updates: { status: string }): Promise<MaintenanceTask> {
    return this.fetchAPI(`/maintenance/tasks/${taskId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async getStats(): Promise<MaintenanceStats> {
    return this.fetchAPI('/maintenance/tasks/stats');
  }

  async getAssets(): Promise<Asset[]> {
    return this.fetchAPI('/maintenance/assets');
  }

  // HU8 - Métodos para Recordatorios de Mantenimiento
  async getReminderStats(): Promise<ReminderStats> {
    return this.fetchAPI('/maintenance/reminders/stats');
  }

  async getReminders(): Promise<{ reminders: MaintenanceReminder[] }> {
    return this.fetchAPI('/maintenance/reminders');
  }
}

// HU8 - Interfaces para recordatorios
export interface MaintenanceReminder {
  id: string;
  asset_id: number;
  maintenance_task_id: string;
  reminder_type: string;
  priority: string;
  title: string;
  message: string;
  created_at: string;
  due_date: string;
  reminded_at?: string;
  dismissed_at?: string;
  is_active: boolean;
  is_dismissed: boolean;
  days_before_due: number;
  asset_name?: string;
  asset_code?: string;
  asset_model?: string;
  task_title?: string;
  task_status?: string;
}

export interface ReminderStats {
  total_active: number;
  overdue: number;
  due_soon: number;
  critical_priority: number;
}

export const maintenanceAPI = new MaintenanceAPI();