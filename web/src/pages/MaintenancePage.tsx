import React, { useState, useEffect } from 'react';
import { maintenanceAPI, MaintenanceTask, MaintenanceStats, MaintenanceReminder, ReminderStats } from '../api/maintenance';

const MaintenancePage: React.FC = () => {
  const [tasks, setTasks] = useState<MaintenanceTask[]>([]);
  const [stats, setStats] = useState<MaintenanceStats>({
    total: 0,
    pending: 0,
    in_progress: 0,
    completed: 0,
    overdue: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNewTaskForm, setShowNewTaskForm] = useState(false);
  const [assets, setAssets] = useState<{ id: number; name: string; model: string; brand: string; location: string }[]>([]);
  const [showReminders, setShowReminders] = useState(false);
  const [reminders, setReminders] = useState<MaintenanceReminder[]>([]);
  const [reminderStats, setReminderStats] = useState<ReminderStats>({
    total_active: 0,
    overdue: 0,
    due_soon: 0,
    critical_priority: 0
  });
  const [loadingReminders, setLoadingReminders] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');

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

  const loadReminders = async () => {
    try {
      setLoadingReminders(true);
      setError(null);
      const [remindersData, reminderStatsData] = await Promise.all([
        maintenanceAPI.getReminders(),
        maintenanceAPI.getReminderStats()
      ]);
      setReminders(remindersData.reminders);
      setReminderStats(reminderStatsData);
    } catch (err) {
      setError('Error al cargar recordatorios');
      console.error(err);
    } finally {
      setLoadingReminders(false);
    }
  };

  const handleStatusChange = async (taskId: number, status: string) => {
    try {
      setError(null);
      await maintenanceAPI.updateTask(taskId, { status });
      
      // Actualizar el estado local inmediatamente para mejor UX
      setTasks(prevTasks => 
        prevTasks.map(task => 
          task.id === taskId ? { ...task, status: status as MaintenanceTask['status'] } : task
        )
      );
      
      // Recargar estadísticas
      const newStats = await maintenanceAPI.getStats();
      setStats(newStats);
    } catch (err) {
      setError('Error al actualizar el estado de la tarea');
      console.error(err);
      // Revertir el cambio local si falla
      await loadTasks();
    }
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

  // FUNCIÓN QUE SÍ ORDENA CORRECTAMENTE 
  const getTasksOrdered = () => {
    if (!tasks || tasks.length === 0) return [];
    
    const now = new Date();
    console.log('🔥 ORDENANDO TAREAS - Total:', tasks.length);
    
    // CREAR NUEVO ARRAY Y ORDENAR INMEDIATAMENTE
    const orderedTasks = [...tasks].sort((a, b) => {
      // Calcular si está vencido (fecha pasada Y no completado)
      const aIsOverdue = a.due_date && new Date(a.due_date) < now && a.status !== 'completada';
      const bIsOverdue = b.due_date && new Date(b.due_date) < now && b.status !== 'completada';
      
      // PRIORIDAD ABSOLUTA
      let aPriority = 999;
      let bPriority = 999;
      
      // VENCIDOS = PRIORIDAD 0 (PRIMERO SIEMPRE)
      if (aIsOverdue) {
        aPriority = 0;
      } else if (a.status === 'pendiente') {
        aPriority = 1;
      } else if (a.status === 'en_progreso') {
        aPriority = 2;
      } else if (a.status === 'completada') {
        aPriority = 3;
      }
      
      if (bIsOverdue) {
        bPriority = 0;
      } else if (b.status === 'pendiente') {
        bPriority = 1;
      } else if (b.status === 'en_progreso') {
        bPriority = 2;
      } else if (b.status === 'completada') {
        bPriority = 3;
      }
      
      console.log(`${a.asset_name}: priority ${aPriority}, ${b.asset_name}: priority ${bPriority}`);
      
      const result = aPriority - bPriority;
      console.log(`Resultado comparación: ${result}`);
      return result;
    });
    
    console.log('✅ ORDEN FINAL:', orderedTasks.map((t, i) => `${i+1}. ${t.asset_name} (${t.status})`));
    return orderedTasks;
  };

  useEffect(() => {
    loadTasks();
  }, []);

  useEffect(() => {
    if (showReminders) {
      loadReminders();
    }
  }, [showReminders]);

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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600 mx-auto mb-6"></div>
          <p className="text-gray-700 text-xl font-medium">Cargando sistema de mantenimiento...</p>
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-slate-800 relative overflow-hidden">
      {/* Patrón de fondo profesional */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-900/20 via-transparent to-purple-900/20"></div>
      <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(59,130,246,0.05)_25%,rgba(59,130,246,0.05)_50%,transparent_50%,transparent_75%,rgba(147,51,234,0.05)_75%)] bg-[length:60px_60px]"></div>
      <div className="relative z-10">
        
      {/* Header con fondo oscuro profesional */}
      <div className="bg-gradient-to-br from-slate-900 via-gray-900 to-slate-800 text-white shadow-2xl border-b border-blue-500/30">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="text-center text-white">
            <div className="mb-4">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 rounded-2xl backdrop-blur-sm mb-4">
                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
            <h1 className="text-5xl font-black mb-4 bg-gradient-to-r from-blue-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent drop-shadow-lg">
              🔧 Sistema de Mantenimiento
            </h1>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto font-medium leading-relaxed">
              Gestión inteligente de mantenimientos preventivos y correctivos con tecnología avanzada
            </p>
            <div className="mt-8">
              <button
                onClick={() => setShowReminders(!showReminders)}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-4 rounded-xl shadow-xl transition-all duration-300 font-bold text-lg transform hover:scale-105 hover:shadow-2xl ring-2 ring-blue-400/30"
              >
                {showReminders ? '📋 Ver Mantenimientos' : '🕒 Ver Recordatorios'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {showReminders ? (
          <div>
            {/* Stats de Recordatorios - Organizados por prioridad */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 -mt-6">
              {/* VENCIDOS - MÁXIMA PRIORIDAD */}
              <div className="order-1 bg-gradient-to-br from-red-900/90 to-red-800/90 backdrop-blur-xl shadow-2xl rounded-2xl border-2 border-red-500/70 hover:shadow-red-500/30 hover:shadow-3xl transition-all duration-300 transform hover:-translate-y-2">
                <div className="p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-14 h-14 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center shadow-xl ring-4 ring-red-400/50">
                        <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      </div>
                    </div>
                    <div className="ml-4">
                      <p className="text-4xl font-black bg-gradient-to-r from-red-300 to-red-100 bg-clip-text text-transparent drop-shadow-lg">
                        {reminderStats.overdue}
                      </p>
                      <p className="text-sm font-bold text-red-300 uppercase tracking-wide">🚨 VENCIDOS</p>
                      <p className="text-xs text-red-200 font-semibold">Requiere acción inmediata</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* PRÓXIMOS - SEGUNDA PRIORIDAD */}
              <div className="order-2 bg-gradient-to-br from-amber-900/90 to-amber-800/90 backdrop-blur-xl shadow-xl rounded-2xl border border-amber-500/60 hover:shadow-amber-500/20 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 hover:scale-102">
                <div className="p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-13 h-13 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl flex items-center justify-center shadow-lg ring-2 ring-amber-400/50">
                        <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                        </svg>
                      </div>
                    </div>
                    <div className="ml-4">
                      <p className="text-3xl font-bold bg-gradient-to-r from-amber-300 to-amber-100 bg-clip-text text-transparent">
                        {reminderStats.due_soon}
                      </p>
                      <p className="text-sm font-bold text-amber-300 uppercase tracking-wide">⏰ PRÓXIMOS</p>
                      <p className="text-xs text-amber-200 font-medium">Programar pronto</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* EN SEGUIMIENTO - CRÍTICOS */}
              <div className="order-3 bg-gradient-to-br from-purple-900/90 to-purple-800/90 backdrop-blur-xl shadow-lg rounded-2xl border border-purple-500/50 hover:shadow-purple-500/20 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                <div className="p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                        <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm0 4a1 1 0 011-1h6a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h3a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                        </svg>
                      </div>
                    </div>
                    <div className="ml-4">
                      <p className="text-3xl font-bold bg-gradient-to-r from-purple-300 to-purple-100 bg-clip-text text-transparent">
                        {reminderStats.critical_priority}
                      </p>
                      <p className="text-sm font-semibold text-purple-300">🔄 En Seguimiento</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* TOTAL ACTIVOS - INFORMACIÓN */}
              <div className="order-4 bg-gradient-to-br from-slate-800/90 to-gray-800/90 backdrop-blur-xl shadow-lg rounded-2xl border border-blue-500/30 hover:shadow-blue-500/20 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                <div className="p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                        <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                        </svg>
                      </div>
                    </div>
                    <div className="ml-4">
                      <p className="text-3xl font-bold bg-gradient-to-r from-blue-300 to-blue-100 bg-clip-text text-transparent">
                        {reminderStats.total_active}
                      </p>
                      <p className="text-sm font-semibold text-blue-300">📊 Total Activos</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Lista de Recordatorios */}
            <div className="bg-slate-800/95 backdrop-blur-lg shadow-2xl rounded-2xl border border-slate-600/50">
              <div className="px-8 py-6 border-b border-slate-600/50">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-300 to-purple-300 bg-clip-text text-transparent">
                      🕒 Recordatorios de Mantenimiento
                    </h2>
                    <p className="text-gray-400 mt-1">Sistema automático de recordatorios para mantenimientos pendientes</p>
                  </div>
                  <button 
                    onClick={loadReminders}
                    className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white px-6 py-3 rounded-xl shadow-lg transition-all duration-200 transform hover:scale-105 flex items-center space-x-2"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                    </svg>
                    <span>Actualizar</span>
                  </button>
                </div>
              </div>
              
              <div className="divide-y divide-gray-100">
                {loadingReminders ? (
                  <div className="p-12 text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-200 border-t-purple-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Cargando recordatorios...</p>
                  </div>
                ) : reminders.length === 0 ? (
                  <div className="p-12 text-center">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No hay recordatorios activos</h3>
                    <p className="text-gray-600">Los recordatorios apareceran aqui cuando haya mantenimientos proximos a vencer</p>
                  </div>
                ) : (
                  reminders.map(reminder => (
                    <div key={reminder.id} className="flex mb-6">
                      <div className={`w-2 ${
                        reminder.priority === 'critical' ? 'bg-red-500' :
                        reminder.priority === 'high' ? 'bg-orange-500' :
                        reminder.priority === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                      }`}></div>
                      <div className="flex-1 p-8 bg-slate-800/50 rounded-xl shadow-lg border border-slate-600">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-4 mb-5">
                              <div className="w-3 h-3 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full"></div>
                              <h3 className="text-xl font-bold text-white">{reminder.title}</h3>
                              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                                reminder.priority === 'critical' ? 'bg-red-900/50 text-red-300 border border-red-500' :
                                reminder.priority === 'high' ? 'bg-orange-900/50 text-orange-300 border border-orange-500' :
                                reminder.priority === 'medium' ? 'bg-yellow-900/50 text-yellow-300 border border-yellow-500' :
                                'bg-green-900/50 text-green-300 border border-green-500'
                              }`}>
                                {reminder.priority === 'critical' ? '🚨 Crítico' :
                                 reminder.priority === 'high' ? '⚠️ Alto' :
                                 reminder.priority === 'medium' ? '⚡ Medio' : '✔️ Bajo'}
                              </span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-5">
                              <div className="bg-slate-700/50 border border-slate-600 p-4 rounded-lg">
                                <p className="text-sm font-semibold text-gray-300 mb-2">🚛 Activo:</p>
                                <p className="text-white font-bold text-lg">{reminder.asset_name || 'N/A'}</p>
                                <p className="text-gray-400 text-sm mt-1">{reminder.asset_code || ''}</p>
                              </div>
                              <div className="bg-slate-700/50 border border-slate-600 p-4 rounded-lg">
                                <p className="text-sm font-semibold text-gray-300 mb-2">📅 Vence:</p>
                                <p className="text-white font-bold text-lg">
                                  {reminder.due_date ? new Date(reminder.due_date).toLocaleDateString('es-ES') : 'N/A'}
                                </p>
                              </div>
                              <div className="bg-slate-700/50 border border-slate-600 p-4 rounded-lg">
                                <p className="text-sm font-semibold text-gray-300 mb-2">📍 Días restantes:</p>
                                <p className={`font-bold text-2xl ${
                                  reminder.days_before_due < 0 ? 'text-red-400' : 
                                  reminder.days_before_due <= 3 ? 'text-orange-400' : 'text-green-400'
                                }`}>
                                  {reminder.days_before_due !== undefined ? 
                                    (reminder.days_before_due < 0 ? 
                                      `${Math.abs(reminder.days_before_due)} días vencido` : 
                                      `${reminder.days_before_due} días`) 
                                    : 'N/A'}
                                </p>
                              </div>
                            </div>
                            <div className="bg-slate-700/50 border border-slate-600 p-5 rounded-lg">
                              <p className="text-sm font-semibold text-gray-300 mb-2">📝 Descripción:</p>
                              <p className="text-gray-200 leading-relaxed text-base">{reminder.message || 'Sin descripción disponible'}</p>
                            </div>
                          </div>
                          <div className="ml-6">
                            <span className={`inline-flex items-center px-3 py-2 rounded-lg text-sm font-medium ${
                              reminder.is_active ? 'bg-green-900/50 text-green-300 border border-green-500' :
                              'bg-gray-700/50 text-gray-300 border border-gray-600'
                            }`}>
                              {reminder.is_active ? '🟢 Activo' : '⚪ Inactivo'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        ) : (
          <div>
            {/* Cards de estadísticas - Reorganizadas por prioridad */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 mb-10 -mt-6">
              {/* VENCIDOS - MÁXIMA PRIORIDAD */}
              <div className="order-1 bg-gradient-to-br from-red-900/90 to-red-800/90 backdrop-blur-xl shadow-2xl rounded-2xl border-2 border-red-500/70 hover:shadow-red-500/30 hover:shadow-3xl transition-all duration-300 transform hover:-translate-y-2 cursor-pointer" 
                   onClick={() => setFilterStatus('vencido')}>
                <div className="p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-14 h-14 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center shadow-xl ring-4 ring-red-400/50">
                        <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      </div>
                    </div>
                    <div className="ml-4">
                      <p className="text-4xl font-black bg-gradient-to-r from-red-300 to-red-100 bg-clip-text text-transparent drop-shadow-lg">
                        {stats.overdue || 0}
                      </p>
                      <p className="text-sm font-bold text-red-300 uppercase tracking-wide">🚨 VENCIDOS</p>
                      <p className="text-xs text-red-200 font-semibold">Requiere acción inmediata</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* PENDIENTES - SEGUNDA PRIORIDAD */}
              <div className="order-2 bg-gradient-to-br from-amber-900/90 to-amber-800/90 backdrop-blur-xl shadow-xl rounded-2xl border border-amber-500/60 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 hover:scale-102 cursor-pointer"
                   onClick={() => setFilterStatus('pendiente')}>
                <div className="p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-13 h-13 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl flex items-center justify-center shadow-lg ring-2 ring-amber-200">
                        <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                        </svg>
                      </div>
                    </div>
                    <div className="ml-4">
                      <p className="text-3xl font-bold bg-gradient-to-r from-amber-300 to-amber-100 bg-clip-text text-transparent">
                        {stats.pending}
                      </p>
                      <p className="text-sm font-bold text-amber-300 uppercase tracking-wide">⏰ PENDIENTES</p>
                      <p className="text-xs text-amber-200 font-medium">Requiere atención</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* EN PROGRESO - TERCERA PRIORIDAD */}
              <div className="order-3 bg-gradient-to-br from-purple-900/90 to-purple-800/90 backdrop-blur-xl shadow-lg rounded-2xl border border-purple-500/50 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 cursor-pointer"
                   onClick={() => setFilterStatus('en_progreso')}>
                <div className="p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                        <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm0 4a1 1 0 011-1h6a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h3a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                        </svg>
                      </div>
                    </div>
                    <div className="ml-4">
                      <p className="text-3xl font-bold bg-gradient-to-r from-purple-300 to-purple-100 bg-clip-text text-transparent">
                        {stats.in_progress}
                      </p>
                      <p className="text-sm font-semibold text-purple-300">🔄 En Progreso</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* COMPLETADAS - INFORMATIVO */}
              <div className="order-4 bg-gradient-to-br from-green-900/90 to-green-800/90 backdrop-blur-xl shadow-lg rounded-2xl border border-green-500/50 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 cursor-pointer"
                   onClick={() => setFilterStatus('completada')}>
                <div className="p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg">
                        <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    </div>
                    <div className="ml-4">
                      <p className="text-3xl font-bold bg-gradient-to-r from-green-300 to-green-100 bg-clip-text text-transparent">
                        {stats.completed}
                      </p>
                      <p className="text-sm font-semibold text-green-300">✅ Completadas</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* TOTAL - INFORMACIÓN */}
              <div className="order-5 bg-gradient-to-br from-slate-800/90 to-gray-800/90 backdrop-blur-xl shadow-lg rounded-2xl border border-blue-500/30 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 cursor-pointer"
                   onClick={() => setFilterStatus('all')}>
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
                      <p className="text-3xl font-bold bg-gradient-to-r from-blue-300 to-blue-100 bg-clip-text text-transparent">
                        {stats.total}
                      </p>
                      <p className="text-sm font-semibold text-blue-300">📊 Total</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Sección de tareas */}
            <div className="bg-white/95 backdrop-blur-xl shadow-2xl rounded-2xl border border-gray-300/30">
              <div className="px-8 py-6 border-b border-gray-300/50">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-800 to-slate-700 bg-clip-text text-transparent">
                      Tareas de Mantenimiento
                      {filterStatus !== 'all' && (
                        <span className="ml-3 text-lg font-normal text-blue-600 animate-pulse">
                          - Filtrado por: {filterStatus === 'vencido' ? '🚨 Vencidos' : 
                                             filterStatus === 'pendiente' ? '⏰ Pendientes' :
                                             filterStatus === 'en_progreso' ? '🔄 En Progreso' :
                                             filterStatus === 'completada' ? '✅ Completadas' : filterStatus}
                        </span>
                      )}
                    </h2>
                    <p className="text-gray-700 mt-1">Gestiona y supervisa todos los mantenimientos programados</p>
                    {filterStatus !== 'all' && (
                      <button 
                        onClick={() => setFilterStatus('all')}
                        className="mt-2 text-sm bg-blue-100 hover:bg-blue-200 px-3 py-1 rounded-lg transition-colors font-semibold text-blue-700 shadow-sm"
                      >
                        🔄 Mostrar todos
                      </button>
                    )}
                  </div>
                  <div className="flex items-center space-x-4">
                    <button 
                      onClick={() => setShowNewTaskForm(true)}
                      className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white px-6 py-3 rounded-xl shadow-xl transition-all duration-200 transform hover:scale-105 flex items-center space-x-2 border border-emerald-500/30"
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                      </svg>
                      <span>Nuevo Mantenimiento</span>
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="divide-y divide-slate-700/50">
                {/* ORDENAMIENTO FORZADO: VENCIDOS SIEMPRE PRIMERO */}
                {(() => {
                  const now = new Date();
                  let filteredTasks = [...tasks];
                  
                  console.log('🔍 FILTRO ACTIVO:', filterStatus);
                  console.log('📋 TAREAS TOTALES:', tasks.length);
                  
                  // APLICAR FILTRO
                  if (filterStatus !== 'all') {
                    if (filterStatus === 'vencido') {
                      filteredTasks = tasks.filter(task => 
                        task.due_date && new Date(task.due_date) < now && task.status !== 'completada'
                      );
                      console.log('🚨 TAREAS VENCIDAS FILTRADAS:', filteredTasks.length);
                    } else {
                      filteredTasks = tasks.filter(task => task.status === filterStatus);
                      console.log(`📊 TAREAS CON STATUS "${filterStatus}":`, filteredTasks.length);
                    }
                  } else {
                    console.log('✅ MOSTRANDO TODAS LAS TAREAS:', filteredTasks.length);
                  }
                  
                  // ORDENAR TAREAS FILTRADAS
                  const sortedTasks = filteredTasks.sort((a, b) => {
                    // Determinar vencimiento
                    const aVencido = a.due_date && new Date(a.due_date) < now && a.status !== 'completada';
                    const bVencido = b.due_date && new Date(b.due_date) < now && b.status !== 'completada';
                    
                    // VENCIDOS PRIMERO ABSOLUTO
                    if (aVencido && !bVencido) return -1;
                    if (!aVencido && bVencido) return 1;
                    
                    // Mismo tipo (vencidos o no vencidos), ordenar por estado
                    const orden = { 'en_progreso': 0, 'pendiente': 1, 'completada': 2 };
                    return (orden[a.status] || 3) - (orden[b.status] || 3);
                  });
                  
                  console.log('✨ TAREAS FINALES A MOSTRAR:', sortedTasks.length);
                  
                  // SI NO HAY TAREAS FILTRADAS, MOSTRAR MENSAJE
                  if (sortedTasks.length === 0) {
                    return (
                      <div className="p-12 text-center">
                        <div className="w-20 h-20 bg-slate-700/50 rounded-full flex items-center justify-center mx-auto mb-4">
                          <svg className="w-10 h-10 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                          </svg>
                        </div>
                        <p className="text-xl font-semibold text-slate-300 mb-2">
                          No hay tareas {filterStatus === 'vencido' ? 'vencidas' : 
                                       filterStatus === 'pendiente' ? 'pendientes' :
                                       filterStatus === 'en_progreso' ? 'en progreso' :
                                       filterStatus === 'completada' ? 'completadas' : ''}
                        </p>
                        <p className="text-slate-400">
                          {filterStatus !== 'all' ? 'Intenta con otro filtro o muestra todas las tareas' : 'No hay tareas registradas en el sistema'}
                        </p>
                      </div>
                    );
                  }
                  
                  return sortedTasks.map((task, index) => {
                  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'completada';
                  const isPending = task.status === 'pendiente';
                  
                  return (
                    <div key={task.id} className={`flex transition-all duration-500 ${isOverdue ? 'animate-glow-border' : ''}`}>
                      <div className={`w-2 ${ 
                        isOverdue ? 'bg-gradient-to-b from-red-500 to-red-600 shadow-lg shadow-red-500/50' :
                        task.status === 'pendiente' ? 'bg-gradient-to-b from-amber-500 to-amber-600' :
                        task.status === 'en_progreso' ? 'bg-gradient-to-b from-purple-500 to-purple-600' :
                        task.status === 'completada' ? 'bg-gradient-to-b from-green-500 to-green-600' : 'bg-gray-500'
                      }`}></div>
                      <div className={`flex-1 p-8 transition-all duration-300 ${
                        isOverdue ? 'bg-gradient-to-r from-red-950/80 to-red-900/70 hover:from-red-950/90 hover:to-red-900/80 backdrop-blur-sm border border-red-800/30' :
                        isPending ? 'bg-gradient-to-r from-amber-950/60 to-amber-900/50 hover:from-amber-950/70 hover:to-amber-900/60 backdrop-blur-sm border border-amber-800/30' :
                        task.status === 'en_progreso' ? 'bg-gradient-to-r from-purple-950/60 to-purple-900/50 hover:from-purple-950/70 hover:to-purple-900/60 backdrop-blur-sm border border-purple-800/30' :
                        task.status === 'completada' ? 'bg-gradient-to-r from-green-950/60 to-green-900/50 hover:from-green-950/70 hover:to-green-900/60 backdrop-blur-sm border border-green-800/30' :
                        'bg-slate-800/70 hover:bg-slate-800/80 backdrop-blur-sm border border-slate-700/50'
                      }`}>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-4 mb-4">
                              <div className={`w-3 h-3 rounded-full ${
                                isOverdue ? 'bg-gradient-to-r from-red-500 to-red-600 shadow-lg shadow-red-500/50 animate-glow-red' :
                                isPending ? 'bg-gradient-to-r from-amber-500 to-amber-600 shadow-lg shadow-amber-500/50' :
                                task.status === 'en_progreso' ? 'bg-gradient-to-r from-purple-500 to-purple-600 shadow-lg shadow-purple-500/50' :
                                task.status === 'completada' ? 'bg-gradient-to-r from-green-500 to-green-600 shadow-lg shadow-green-500/50' :
                                'bg-gradient-to-r from-slate-400 to-slate-500'
                              }`}></div>
                              <h3 className={`text-xl font-bold ${
                                isOverdue ? 'text-red-200' : 
                                isPending ? 'text-amber-200' :
                                task.status === 'en_progreso' ? 'text-purple-200' :
                                task.status === 'completada' ? 'text-green-200' :
                                'text-gray-100'
                              }`}>{task.asset_name}</h3>
                              {isOverdue && (
                                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-red-500/20 text-red-200 border border-red-400/50 backdrop-blur-sm shadow-lg shadow-red-500/20">
                                  🚨 VENCIDO
                                </span>
                              )}
                              <span className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-bold border-2 shadow-lg ${
                                isOverdue ? 'bg-red-500/20 text-red-200 border-red-400/50 shadow-red-500/20' :
                                task.status === 'pendiente' ? 'bg-amber-500/20 text-amber-200 border-amber-400/50 shadow-amber-500/20' :
                                task.status === 'en_progreso' ? 'bg-purple-500/20 text-purple-200 border-purple-400/50 shadow-purple-500/20' :
                                task.status === 'completada' ? 'bg-green-500/20 text-green-200 border-green-400/50 shadow-green-500/20' : 
                                'bg-gray-500/20 text-gray-200 border-gray-400/50'
                              } transition-all duration-200`}>
                                {getStatusText(task.status)}
                              </span>
                            </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className={`flex items-center space-x-3 rounded-lg p-4 border ${
                              isOverdue ? 'bg-red-900/30 border-red-700/50' :
                              isPending ? 'bg-amber-900/30 border-amber-700/50' :
                              task.status === 'en_progreso' ? 'bg-purple-900/30 border-purple-700/50' :
                              task.status === 'completada' ? 'bg-green-900/30 border-green-700/50' :
                              'bg-slate-800/50 border-slate-600/50'
                            }`}>
                              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                                isOverdue ? 'bg-red-500/20' :
                                isPending ? 'bg-amber-500/20' :
                                task.status === 'en_progreso' ? 'bg-purple-500/20' :
                                task.status === 'completada' ? 'bg-green-500/20' :
                                'bg-blue-500/20'
                              }`}>
                                <svg className={`w-5 h-5 ${
                                  isOverdue ? 'text-red-300' :
                                  isPending ? 'text-amber-300' :
                                  task.status === 'en_progreso' ? 'text-purple-300' :
                                  task.status === 'completada' ? 'text-green-300' :
                                  'text-blue-300'
                                }`} fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                                </svg>
                              </div>
                              <div>
                                <p className="text-sm font-medium text-gray-400">Activo</p>
                                <p className="font-semibold text-white">{task.asset_name}</p>
                              </div>
                            </div>
                            
                            <div className={`flex items-center space-x-3 rounded-lg p-4 border ${
                              isOverdue ? 'bg-red-900/30 border-red-700/50' :
                              isPending ? 'bg-amber-900/30 border-amber-700/50' :
                              task.status === 'en_progreso' ? 'bg-purple-900/30 border-purple-700/50' :
                              task.status === 'completada' ? 'bg-green-900/30 border-green-700/50' :
                              'bg-slate-800/50 border-slate-600/50'
                            }`}>
                              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                                isOverdue ? 'bg-red-500/20' :
                                isPending ? 'bg-amber-500/20' :
                                task.status === 'en_progreso' ? 'bg-purple-500/20' :
                                task.status === 'completada' ? 'bg-green-500/20' :
                                'bg-purple-500/20'
                              }`}>
                                <svg className={`w-5 h-5 ${
                                  isOverdue ? 'text-red-300' :
                                  isPending ? 'text-amber-300' :
                                  task.status === 'en_progreso' ? 'text-purple-300' :
                                  task.status === 'completada' ? 'text-green-300' :
                                  'text-purple-300'
                                }`} fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                                </svg>
                              </div>
                              <div>
                                <p className="text-sm font-medium text-gray-400">Tipo</p>
                                <p className="font-semibold text-white capitalize">{task.task_type}</p>
                              </div>
                            </div>
                            
                            <div className={`flex items-center space-x-3 rounded-lg p-4 border ${
                              isOverdue ? 'bg-red-900/30 border-red-700/50' :
                              isPending ? 'bg-amber-900/30 border-amber-700/50' :
                              task.status === 'en_progreso' ? 'bg-purple-900/30 border-purple-700/50' :
                              task.status === 'completada' ? 'bg-green-900/30 border-green-700/50' :
                              'bg-slate-800/50 border-slate-600/50'
                            }`}>
                              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                                isOverdue ? 'bg-red-500/20' :
                                isPending ? 'bg-amber-500/20' :
                                task.status === 'en_progreso' ? 'bg-purple-500/20' :
                                task.status === 'completada' ? 'bg-green-500/20' :
                                'bg-green-500/20'
                              }`}>
                                <svg className={`w-5 h-5 ${
                                  isOverdue ? 'text-red-300' :
                                  isPending ? 'text-amber-300' :
                                  task.status === 'en_progreso' ? 'text-purple-300' :
                                  task.status === 'completada' ? 'text-green-300' :
                                  'text-green-300'
                                }`} fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                                </svg>
                              </div>
                              <div>
                                <p className="text-sm font-medium text-gray-400">Fecha límite</p>
                                <p className="font-semibold text-white">{formatDate(task.due_date)}</p>
                              </div>
                            </div>
                          </div>
                          
                          {task.description && (
                            <div className={`mt-6 p-4 rounded-lg border ${
                              isOverdue ? 'bg-red-900/20 border-red-700/50' :
                              isPending ? 'bg-amber-900/20 border-amber-700/50' :
                              task.status === 'en_progreso' ? 'bg-purple-900/20 border-purple-700/50' :
                              task.status === 'completada' ? 'bg-green-900/20 border-green-700/50' :
                              'bg-slate-800/50 border-slate-600/50'
                            }`}>
                              <p className="text-gray-300 leading-relaxed">
                                <span className="font-semibold text-white">Descripción:</span> {task.description}
                              </p>
                            </div>
                          )}
                          
                          {task.technician_assigned && task.technician_assigned !== 'Sin asignar' && (
                            <div className={`mt-4 p-3 rounded-lg border inline-flex items-center space-x-2 ${
                              isOverdue ? 'bg-red-900/20 border-red-700/50' :
                              isPending ? 'bg-amber-900/20 border-amber-700/50' :
                              task.status === 'en_progreso' ? 'bg-purple-900/20 border-purple-700/50' :
                              task.status === 'completada' ? 'bg-green-900/20 border-green-700/50' :
                              'bg-slate-800/50 border-slate-600/50'
                            }`}>
                              <svg className="w-5 h-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                              </svg>
                              <span className="text-sm font-medium text-gray-400">Técnico:</span>
                              <span className="font-semibold text-white">{task.technician_assigned}</span>
                            </div>
                          )}
                        </div>
                        
                        <div className="ml-8 mt-6">
                          <select 
                            value={task.status} 
                            onChange={(e) => handleStatusChange(task.id, e.target.value)}
                            className="block w-full px-4 py-3 bg-slate-900/50 border-2 border-slate-600/50 rounded-xl shadow-sm focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 text-sm font-medium text-white transition-all duration-200 hover:bg-slate-900/70"
                          >
                            <option value="pendiente">Pendiente</option>
                            <option value="en_progreso">En Progreso</option>
                            <option value="completada">Completada</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })})()}
              </div>
            </div>
          </div>
        )}

        {/* Modal para nueva mantención */}
        {showNewTaskForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 max-h-[90vh] overflow-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-bold text-gray-900">Nuevo Mantenimiento</h3>
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
                      <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de Mantenimiento</label>
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
                        placeholder="Detalles especificos del mantenimiento..."
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
                      Crear Mantenimiento
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
    </div>
  );
};

export default MaintenancePage;