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


}

export const maintenanceAPI = new MaintenanceAPI();