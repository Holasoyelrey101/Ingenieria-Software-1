import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

interface Load {
    id: number;
    origin: string;
    destination: string;
    status: string;
    vehicle_id: number | null;
    driver_id: number | null;
    created_at: string | null;
    updated_at: string | null;
    vehicle_name: string | null;
    driver_name: string | null;
    assignment_status: 'Asignada' | 'No asignada';
}

interface LoadsSummary {
    total: number;
    assigned: number;
    unassigned: number;
}

export default function LoadsManagement() {
    const [loads, setLoads] = useState<Load[]>([]);
    const [summary, setSummary] = useState<LoadsSummary>({ total: 0, assigned: 0, unassigned: 0 });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [cancelling, setCancelling] = useState<number | null>(null);

    const fetchLoads = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await axios.get(`${API_URL}/api/loads/summary`);
            setLoads(response.data.loads || []);
            setSummary(response.data.summary || { total: 0, assigned: 0, unassigned: 0 });
        } catch (err: any) {
            console.error('Error al cargar cargas:', err);
            setError(err?.response?.data?.detail || err.message || 'Error al cargar cargas');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLoads();
    }, []);

    const handleCancelRoute = async (loadId: number, origin: string, destination: string) => {
        const confirmed = window.confirm(
            `¿Estás seguro de cancelar esta ruta?\n\nOrigen: ${origin}\nDestino: ${destination}\n\nEsto liberará el vehículo y el conductor asignados.`
        );

        if (!confirmed) return;

        try {
            setCancelling(loadId);
            const response = await axios.put(`${API_URL}/api/routes/${loadId}/cancel`);

            if (response.data.success) {
                alert(`✅ Ruta cancelada exitosamente\n\n${response.data.message}`);
                // Recargar datos
                await fetchLoads();
            }
        } catch (err: any) {
            console.error('Error al cancelar ruta:', err);
            const errorMsg = err?.response?.data?.detail || err.message || 'Error al cancelar ruta';
            alert(`❌ Error al cancelar ruta:\n\n${errorMsg}`);
        } finally {
            setCancelling(null);
        }
    };

    const getStatusBadgeColor = (status: string) => {
        switch (status.toLowerCase()) {
            case 'assigned':
            case 'asignado':
                return '#3B82F6'; // blue
            case 'en_progreso':
            case 'in_progress':
                return '#F59E0B'; // amber
            case 'completado':
            case 'completed':
                return '#10B981'; // green
            case 'cancelado':
            case 'cancelled':
                return '#EF4444'; // red
            default:
                return '#6B7280'; // gray
        }
    };

    const getAssignmentBadgeColor = (assignmentStatus: string) => {
        return assignmentStatus === 'Asignada' ? '#10B981' : '#6B7280';
    };

    if (loading) {
        return (
            <div style={{ padding: '20px', textAlign: 'center' }}>
                <div style={{ fontSize: '18px', color: '#666' }}>⏳ Cargando datos...</div>
            </div>
        );
    }

    return (
        <div style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto' }}>
            <h1 style={{ marginBottom: '20px', color: '#1F2937' }}>📦 Gestión de Cargas</h1>

            {error && (
                <div style={{
                    background: '#FEE2E2',
                    border: '1px solid #FCA5A5',
                    color: '#991B1B',
                    padding: '12px',
                    borderRadius: '6px',
                    marginBottom: '20px'
                }}>
                    ⚠️ {error}
                </div>
            )}

            {/* Métricas */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '16px',
                marginBottom: '24px'
            }}>
                <div style={{
                    background: '#F3F4F6',
                    padding: '20px',
                    borderRadius: '8px',
                    border: '2px solid #E5E7EB'
                }}>
                    <div style={{ fontSize: '14px', color: '#6B7280', marginBottom: '8px' }}>Total de Cargas</div>
                    <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#1F2937' }}>{summary.total}</div>
                </div>

                <div style={{
                    background: '#D1FAE5',
                    padding: '20px',
                    borderRadius: '8px',
                    border: '2px solid #6EE7B7'
                }}>
                    <div style={{ fontSize: '14px', color: '#065F46', marginBottom: '8px' }}>Cargas Asignadas</div>
                    <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#047857' }}>{summary.assigned}</div>
                </div>

                <div style={{
                    background: '#E5E7EB',
                    padding: '20px',
                    borderRadius: '8px',
                    border: '2px solid #9CA3AF'
                }}>
                    <div style={{ fontSize: '14px', color: '#374151', marginBottom: '8px' }}>Cargas No Asignadas</div>
                    <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#4B5563' }}>{summary.unassigned}</div>
                </div>
            </div>

            {/* Tabla de cargas */}
            <div style={{
                background: 'white',
                borderRadius: '8px',
                border: '1px solid #E5E7EB',
                overflow: 'hidden'
            }}>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ background: '#F9FAFB', borderBottom: '2px solid #E5E7EB' }}>
                                <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#374151' }}>ID</th>
                                <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#374151' }}>Origen</th>
                                <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#374151' }}>Destino</th>
                                <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#374151' }}>Estado</th>
                                <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#374151' }}>Asignación</th>
                                <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#374151' }}>Vehículo</th>
                                <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#374151' }}>Conductor</th>
                                <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#374151' }}>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loads.length === 0 ? (
                                <tr>
                                    <td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: '#6B7280' }}>
                                        No hay cargas registradas
                                    </td>
                                </tr>
                            ) : (
                                loads.map((load) => (
                                    <tr key={load.id} style={{ borderBottom: '1px solid #E5E7EB' }}>
                                        <td style={{ padding: '12px', color: '#1F2937' }}>#{load.id}</td>
                                        <td style={{ padding: '12px', color: '#4B5563', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {load.origin || 'N/A'}
                                        </td>
                                        <td style={{ padding: '12px', color: '#4B5563', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {load.destination || 'N/A'}
                                        </td>
                                        <td style={{ padding: '12px' }}>
                                            <span style={{
                                                display: 'inline-block',
                                                padding: '4px 12px',
                                                borderRadius: '12px',
                                                fontSize: '12px',
                                                fontWeight: '500',
                                                background: getStatusBadgeColor(load.status) + '20',
                                                color: getStatusBadgeColor(load.status)
                                            }}>
                                                {load.status}
                                            </span>
                                        </td>
                                        <td style={{ padding: '12px' }}>
                                            <span style={{
                                                display: 'inline-block',
                                                padding: '4px 12px',
                                                borderRadius: '12px',
                                                fontSize: '12px',
                                                fontWeight: '500',
                                                background: getAssignmentBadgeColor(load.assignment_status) + '20',
                                                color: getAssignmentBadgeColor(load.assignment_status)
                                            }}>
                                                {load.assignment_status}
                                            </span>
                                        </td>
                                        <td style={{ padding: '12px', color: '#4B5563' }}>
                                            {load.vehicle_name || '-'}
                                        </td>
                                        <td style={{ padding: '12px', color: '#4B5563' }}>
                                            {load.driver_name || '-'}
                                        </td>
                                        <td style={{ padding: '12px' }}>
                                            {load.assignment_status === 'Asignada' && load.status !== 'cancelado' && load.status !== 'completado' ? (
                                                <button
                                                    onClick={() => handleCancelRoute(load.id, load.origin, load.destination)}
                                                    disabled={cancelling === load.id}
                                                    style={{
                                                        padding: '6px 12px',
                                                        background: '#EF4444',
                                                        color: 'white',
                                                        border: 'none',
                                                        borderRadius: '4px',
                                                        cursor: cancelling === load.id ? 'not-allowed' : 'pointer',
                                                        fontSize: '13px',
                                                        fontWeight: '500',
                                                        opacity: cancelling === load.id ? 0.6 : 1
                                                    }}
                                                >
                                                    {cancelling === load.id ? '⏳ Cancelando...' : '❌ Cancelar Ruta'}
                                                </button>
                                            ) : (
                                                <span style={{ color: '#9CA3AF', fontSize: '13px' }}>-</span>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Botón de recarga */}
            <div style={{ marginTop: '20px', textAlign: 'center' }}>
                <button
                    onClick={fetchLoads}
                    disabled={loading}
                    style={{
                        padding: '10px 20px',
                        background: '#3B82F6',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: loading ? 'not-allowed' : 'pointer',
                        fontSize: '14px',
                        fontWeight: '500'
                    }}
                >
                    {loading ? '⏳ Cargando...' : '🔄 Recargar Datos'}
                </button>
            </div>
        </div>
    );
}
