import React, { useState, useEffect } from 'react';
import { maintenanceAPI, MaintenanceTask, MaintenanceStats } from '../api/maintenance';

const MaintenancePage: React.FC = () => {
  const [tasks, setTasks] = useState<MaintenanceTask[]>([]);
  const [stats, setStats] = useState<MaintenanceStats>({
    total: 0,
    pending: 0,
    in_progress: 0,
    completed: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNewTaskForm, setShowNewTaskForm] = useState(false);
  const [assets, setAssets] = useState<{ id: number; name: string; model: string; brand: string; location: string }[]>([]);
  const [sortBy, setSortBy] = useState<'status' | 'due_date'>('status');

  const loadTasks = async () => {
    try {
      setLoading(true);
      setError(null);
      const [tasksData, statsData, assetsData] = await Promise.all([
        maintenanceAPI.getTasks(),
        maintenanceAPI.getStats(),
        maintenanceAPI.getAssets()
      ]);
      setTasks(tasksData);
      setStats(statsData);
      setAssets(assetsData);
    } catch (err) {
      setError('Error al cargar datos de mantención');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (taskId: number, status: string) => {
    try {
      setError(null);
      const updatedTask = await maintenanceAPI.updateTask(taskId, { status });
      
      // Actualizar el estado local inmediatamente para mejor UX
      setTasks(prevTasks => 
        prevTasks.map(task => 
          task.id === taskId ? { ...task, status: status as MaintenanceTask['status'] } : task
        )
      );
      
      // Recargar datos para asegurar consistencia
      await loadTasks();
    } catch (err) {
      setError('Error al actualizar tarea');
      console.error(err);
    }
  };

  const handleNewTask = () => {
    setShowNewTaskForm(true);
  };

  const handleCreateTask = async (taskData: any) => {
    try {
      await maintenanceAPI.createTask(taskData);
      setShowNewTaskForm(false);
      await loadTasks(); // Recargar tareas
    } catch (err) {
      setError('Error al crear tarea');
      console.error(err);
    }
  };

  const sortTasks = (tasks: MaintenanceTask[]) => {
    return [...tasks].sort((a, b) => {
      if (sortBy === 'status') {
        const statusOrder = { 'en_progreso': 0, 'pendiente': 1, 'completada': 2 };
        const aOrder = statusOrder[a.status as keyof typeof statusOrder] ?? 3;
        const bOrder = statusOrder[b.status as keyof typeof statusOrder] ?? 3;
        return aOrder - bOrder;
      } else if (sortBy === 'due_date') {
        if (!a.due_date && !b.due_date) return 0;
        if (!a.due_date) return 1;
        if (!b.due_date) return -1;
        return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
      }
      return 0;
    });
  };

  useEffect(() => {
    loadTasks();
  }, []);

  const getStatusColor = (status: MaintenanceTask['status']) => {
    switch (status) {
      case 'pendiente': return '#fbbf24';
      case 'en_progreso': return '#3b82f6';
      case 'completada': return '#10b981';
      default: return '#6b7280';
    }
  };



  const getStatusBadgeClass = (status: MaintenanceTask['status'], due_date: string | null) => {
    switch (status) {
      case 'pendiente':
        return 'bg-gray-100 text-gray-700 border-gray-300';
      case 'en_progreso':
        return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      case 'completada':
        return 'bg-green-100 text-green-700 border-green-300';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  const getStatusText = (status: MaintenanceTask['status']) => {
    switch (status) {
      case 'pendiente':
        return 'Pendiente';
      case 'en_progreso':
        return 'En Progreso';
      case 'completada':
        return 'Completada';
      default:
        return 'Pendiente';
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Sin fecha';
    return new Date(dateString).toLocaleDateString('es-CL');
  };

  const getTaskTypeIcon = (type: MaintenanceTask['task_type']) => {
    switch (type) {
      case 'preventive': return '🔧';
      case 'corrective': return '⚠️';
      case 'predictive': return '📊';
      default: return '🔧';
    }
  };



  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600 mx-auto mb-6"></div>
          <p className="text-gray-700 text-xl font-medium">Cargando sistema de mantención...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full mx-4">
          <div className="text-center">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Error de Conexión</h3>
            <p className="text-red-600 mb-6">{error}</p>
            <button 
              onClick={loadTasks} 
              className="bg-red-600 hover:bg-red-700 text-white px-8 py-3 rounded-xl transition-all duration-200 transform hover:scale-105 shadow-lg"
            >
              Reintentar
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700">
      {/* Header con gradiente */}
      <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-800 shadow-2xl">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="text-center text-white">
            <div className="mb-4">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 rounded-2xl backdrop-blur-sm mb-4">
                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
            <h1 className="text-5xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-white to-blue-100">
              Sistema de Mantención
            </h1>
            <p className="text-xl text-blue-100 max-w-2xl mx-auto">
              Gestión inteligente de mantenciones preventivas y correctivas con tecnología avanzada
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Cards de estadísticas con diseño mejorado */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 mb-10 -mt-6">
          <div className="bg-white backdrop-blur-lg bg-opacity-80 shadow-xl rounded-2xl border border-white/50 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
            <div className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                    <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
                    {stats.total}
                  </p>
                  <p className="text-sm font-semibold text-gray-600">Total Mantenciones</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white backdrop-blur-lg bg-opacity-80 shadow-xl rounded-2xl border border-white/50 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
            <div className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-gradient-to-br from-gray-400 to-gray-500 rounded-xl flex items-center justify-center shadow-lg">
                    <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-3xl font-bold bg-gradient-to-r from-gray-600 to-gray-800 bg-clip-text text-transparent">
                    {stats.pending}
                  </p>
                  <p className="text-sm font-semibold text-gray-600">Pendientes</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white backdrop-blur-lg bg-opacity-80 shadow-xl rounded-2xl border border-white/50 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
            <div className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-xl flex items-center justify-center shadow-lg">
                    <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm0 4a1 1 0 011-1h6a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h3a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-3xl font-bold bg-gradient-to-r from-yellow-600 to-yellow-800 bg-clip-text text-transparent">
                    {stats.in_progress}
                  </p>
                  <p className="text-sm font-semibold text-gray-600">En Progreso</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white backdrop-blur-lg bg-opacity-80 shadow-xl rounded-2xl border border-white/50 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
            <div className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-green-500 rounded-xl flex items-center justify-center shadow-lg">
                    <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-3xl font-bold bg-gradient-to-r from-green-600 to-green-800 bg-clip-text text-transparent">
                    {stats.completed}
                  </p>
                  <p className="text-sm font-semibold text-gray-600">Completadas</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white backdrop-blur-lg bg-opacity-80 shadow-xl rounded-2xl border border-white/50 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
            <div className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-gradient-to-br from-red-400 to-red-500 rounded-xl flex items-center justify-center shadow-lg">
                    <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-3xl font-bold bg-gradient-to-r from-red-600 to-red-800 bg-clip-text text-transparent">
                    {stats.overdue}
                  </p>
                  <p className="text-sm font-semibold text-gray-600">Vencidas</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sección de tareas con diseño moderno */}
        <div className="bg-white/80 backdrop-blur-lg shadow-2xl rounded-2xl border border-white/50">
          <div className="px-8 py-6 border-b border-gray-200/50">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                  Tareas de Mantención
                </h2>
                <p className="text-gray-600 mt-1">Gestiona y supervisa todas las mantenciones programadas</p>
              </div>
              <div className="flex items-center space-x-4">
                <select 
                  value={sortBy} 
                  onChange={(e) => setSortBy(e.target.value as 'status' | 'due_date')}
                  className="bg-white border-2 border-gray-200 rounded-xl px-4 py-2 text-sm font-medium focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500"
                >
                  <option value="status">Ordenar por Estado</option>
                  <option value="due_date">Ordenar por Fecha</option>
                </select>
                <button 
                  onClick={handleNewTask}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-6 py-3 rounded-xl shadow-lg transition-all duration-200 transform hover:scale-105 flex items-center space-x-2"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                  </svg>
                  <span>Nueva Mantención</span>
                </button>
              </div>
            </div>
          </div>
          
          <div className="divide-y divide-gray-100">
            {sortTasks(tasks).map(task => (
              <div key={task.id} className="flex">
                <div className={`w-2 ${ 
                  task.status === 'pendiente' ? 'bg-gray-500' :
                  task.status === 'en_progreso' ? 'bg-yellow-500' :
                  task.status === 'completada' ? 'bg-green-500' : 'bg-gray-500'
                }`}></div>
                <div className="flex-1 p-8 hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-indigo-50/50 transition-all duration-200">
                  <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-4 mb-4">
                      <div className="w-3 h-3 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full"></div>
                      <h3 className="text-xl font-bold text-gray-900">{task.asset_name}</h3>
                      <span className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold border-2 ${
                        task.status === 'pendiente' ? 'bg-gray-100 text-gray-700 border-gray-300' :
                        task.status === 'en_progreso' ? 'bg-yellow-100 text-yellow-700 border-yellow-300' :
                        task.status === 'completada' ? 'bg-green-100 text-green-700 border-green-300' : 'bg-gray-100 text-gray-700 border-gray-300'
                      } transition-all duration-200`}>
                        {getStatusText(task.status)}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-gray-700">
                      <div className="flex items-center space-x-3 bg-gray-50/50 rounded-lg p-3">
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-100 to-blue-200 rounded-lg flex items-center justify-center">
                          <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-600">Activo</p>
                          <p className="font-semibold">{task.asset_name}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-3 bg-gray-50/50 rounded-lg p-3">
                        <div className="w-8 h-8 bg-gradient-to-br from-purple-100 to-purple-200 rounded-lg flex items-center justify-center">
                          <svg className="w-4 h-4 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-600">Tipo</p>
                          <p className="font-semibold">{task.task_type}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-3 bg-gray-50/50 rounded-lg p-3">
                        <div className="w-8 h-8 bg-gradient-to-br from-green-100 to-green-200 rounded-lg flex items-center justify-center">
                          <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-600">Fecha límite</p>
                          <p className="font-semibold">{formatDate(task.due_date)}</p>
                        </div>
                      </div>
                    </div>
                    
                    {task.description && (
                      <div className="mt-4 p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg">
                        <p className="text-gray-700"><span className="font-semibold">Descripción:</span> {task.description}</p>
                      </div>
                    )}
                  </div>
                  
                  <div className="ml-8">
                    <select 
                      value={task.status} 
                      onChange={(e) => handleStatusChange(task.id, e.target.value)}
                      className="block w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 text-sm font-medium transition-all duration-200"
                    >
                      <option value="pendiente">Pendiente</option>
                      <option value="en_progreso">En Progreso</option>
                      <option value="completada">Completada</option>
                    </select>
                  </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modal para nueva mantención */}
      {showNewTaskForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 max-h-[90vh] overflow-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-900">Nueva Mantención</h3>
                <button
                  onClick={() => setShowNewTaskForm(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.target as HTMLFormElement);
                const taskData = {
                  title: formData.get('title') as string,
                  description: formData.get('description') as string,
                  asset_id: parseInt(formData.get('asset_id') as string),
                  due_date: formData.get('due_date') as string || undefined,
                  task_type: formData.get('task_type') as string
                };
                handleCreateTask(taskData);
              }}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Título</label>
                    <input
                      type="text"
                      name="title"
                      required
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500"
                      placeholder="Ej: Mantenimiento preventivo BMW X7"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Vehículo</label>
                    <select
                      name="asset_id"
                      required
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500"
                    >
                      <option value="">Selecciona un vehículo</option>
                      {assets.map(asset => (
                        <option key={asset.id} value={asset.id}>
                          {asset.name} - {asset.brand} {asset.model}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de Mantención</label>
                    <select
                      name="task_type"
                      required
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500"
                    >
                      <option value="Limpieza VIP">Limpieza VIP</option>
                      <option value="Servicio Técnico">Servicio Técnico</option>
                      <option value="Inspección Luxury">Inspección Luxury</option>
                      <option value="Mantenimiento Preventivo">Mantenimiento Preventivo</option>
                      <option value="Reparación">Reparación</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Fecha Límite</label>
                    <input
                      type="date"
                      name="due_date"
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Descripción</label>
                    <textarea
                      name="description"
                      rows={3}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500"
                      placeholder="Detalles específicos de la mantención..."
                    />
                  </div>
                </div>
                
                <div className="flex gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowNewTaskForm(false)}
                    className="flex-1 px-4 py-3 border-2 border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 font-medium transition-all duration-200"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl hover:from-blue-600 hover:to-indigo-700 font-medium transition-all duration-200 shadow-lg"
                  >
                    Crear Mantención
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      
    </div>
  );
};

export default MaintenancePage;