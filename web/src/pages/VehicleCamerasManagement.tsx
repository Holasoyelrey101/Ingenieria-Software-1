import React, { useState, useEffect } from 'react';

interface Vehicle {
  id: number;
  code: string;
  capacity_kg?: number;
  active?: boolean;
}

interface VehicleCamera {
  id: number;
  camera_id: string;
  camera_name: string;
  position: string;
  stream_url?: string;
  active: boolean;
}

export default function VehicleCamerasManagement() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [availableCameras, setAvailableCameras] = useState<string[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<number | null>(null);
  const [vehicleCameras, setVehicleCameras] = useState<VehicleCamera[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  
  // Cargar vehículos y cámaras disponibles
  useEffect(() => {
    loadVehicles();
    loadAvailableCameras();
  }, []);
  
  useEffect(() => {
    if (selectedVehicle) {
      loadVehicleCameras(selectedVehicle);
    }
  }, [selectedVehicle]);
  
  const loadVehicles = async () => {
    try {
      // Intentar obtener vehículos desde el endpoint de logística
      // Si no existe, usar datos de ejemplo o permitir crear manualmente
      const logApiUrl = import.meta.env.VITE_API_LOGISTICA || import.meta.env.VITE_API_URL || 'http://localhost:8001';
      try {
        const res = await fetch(`${logApiUrl}/maps/vehicles`);
        if (res.ok) {
          const data = await res.json();
          setVehicles(data.vehicles || data || []);
        } else {
          // Si no existe el endpoint, usar datos de ejemplo
          setVehicles([
            { id: 1, code: 'VH001', capacity_kg: 5000, active: true },
            { id: 2, code: 'VH002', capacity_kg: 3000, active: true },
          ]);
        }
      } catch (e) {
        // Fallback a datos de ejemplo
        setVehicles([
          { id: 1, code: 'VH001', capacity_kg: 5000, active: true },
          { id: 2, code: 'VH002', capacity_kg: 3000, active: true },
        ]);
      }
    } catch (error) {
      console.error('Error cargando vehículos:', error);
      setError('Error al cargar vehículos');
    } finally {
      setLoading(false);
    }
  };
  
  const loadAvailableCameras = async () => {
    try {
      const res = await fetch(`${apiUrl}/camaras/list`);
      const data = await res.json();
      setAvailableCameras(data.camaras || []);
    } catch (error) {
      console.error('Error cargando cámaras:', error);
      setError('Error al cargar cámaras disponibles');
    }
  };
  
  const loadVehicleCameras = async (vehicleId: number) => {
    try {
      const res = await fetch(`${apiUrl}/camaras/vehicles/${vehicleId}/cameras`);
      if (!res.ok) {
        throw new Error('Error al cargar cámaras del vehículo');
      }
      const data = await res.json();
      setVehicleCameras(data.cameras || []);
    } catch (error) {
      console.error('Error cargando cámaras del vehículo:', error);
      setVehicleCameras([]);
    }
  };
  
  const assignCamera = async (vehicleId: number, cameraId: string) => {
    try {
      const res = await fetch(`${apiUrl}/camaras/vehicles/${vehicleId}/cameras`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          camera_id: cameraId,
          camera_name: `Cámara ${cameraId}`,
          position: 'frontal',
          active: true
        })
      });
      
      if (res.ok) {
        await loadVehicleCameras(vehicleId);
        alert('Cámara asignada correctamente');
      } else {
        const errorData = await res.json().catch(() => ({ detail: 'Error desconocido' }));
        const errorMessage = errorData.detail || 'Error al asignar cámara';
        
        // Mostrar mensaje de error mejorado
        alert(`⚠️ ${errorMessage}`);
      }
    } catch (error) {
      console.error('Error asignando cámara:', error);
      alert('Error al asignar cámara');
    }
  };
  
  const unassignCamera = async (vehicleId: number, cameraId: string) => {
    if (!confirm('¿Está seguro de desasignar esta cámara?')) {
      return;
    }
    
    try {
      const res = await fetch(
        `${apiUrl}/camaras/vehicles/${vehicleId}/cameras/${cameraId}`,
        { method: 'DELETE' }
      );
      
      const data = await res.json().catch(() => null);
      
      if (res.ok) {
        await loadVehicleCameras(vehicleId);
        alert('Cámara desasignada correctamente');
      } else {
        const errorMessage = data?.detail || `Error ${res.status}: ${res.statusText}`;
        console.error('Error al desasignar:', errorMessage);
        alert(`Error: ${errorMessage}`);
      }
    } catch (error: any) {
      console.error('Error desasignando cámara:', error);
      alert(`Error al desasignar cámara: ${error?.message || 'Error de conexión'}`);
    }
  };
  
  if (loading) {
    return (
      <div style={{ minHeight: '60vh', display: 'grid', placeItems: 'center' }}>
        Cargando...
      </div>
    );
  }
  
  if (error) {
    return (
      <div style={{ minHeight: '60vh', display: 'grid', placeItems: 'center', color: '#b91c1c' }}>
        ⚠️ {error}
      </div>
    );
  }
  
  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 16px' }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>
        ⚙️ Gestión de Cámaras por Vehículo
      </h1>
      <p style={{ color: '#6b7280', marginBottom: 24 }}>
        Asigne y gestione las cámaras asignadas a cada vehículo
      </p>
      
      <div style={{ marginBottom: 24 }}>
        <label style={{ display: 'block', marginBottom: 8, fontWeight: 600 }}>
          Seleccionar Vehículo
        </label>
        <select 
          onChange={(e) => {
            const id = Number(e.target.value);
            setSelectedVehicle(id || null);
          }}
          value={selectedVehicle || ''}
          style={{ 
            padding: '0.5rem', 
            fontSize: '1rem',
            width: '100%',
            maxWidth: 400,
            border: '1px solid #d1d5db',
            borderRadius: '6px'
          }}
        >
          <option value="">-- Seleccione un vehículo --</option>
          {vehicles.map((v) => (
            <option key={v.id} value={v.id}>
              {v.code} {v.capacity_kg ? `- ${v.capacity_kg}kg` : ''}
            </option>
          ))}
        </select>
      </div>
      
      {selectedVehicle && (
        <div style={{ 
          background: '#fff', 
          borderRadius: 12, 
          boxShadow: '0 8px 20px rgba(0,0,0,.06)',
          padding: 24
        }}>
          <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 16 }}>
            Cámaras Asignadas
          </h2>
          
          <div style={{ marginBottom: 24 }}>
            {vehicleCameras.length === 0 ? (
              <p style={{ color: '#6b7280', padding: '16px', background: '#f9fafb', borderRadius: 8 }}>
                No hay cámaras asignadas a este vehículo
              </p>
            ) : (
              <div style={{ display: 'grid', gap: 12 }}>
                {vehicleCameras.map(cam => (
                  <div 
                    key={cam.id}
                    style={{
                      padding: '12px 16px',
                      background: '#f9fafb',
                      borderRadius: 8,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <div>
                      <strong>{cam.camera_name || cam.camera_id}</strong>
                      <div style={{ fontSize: 14, color: '#6b7280', marginTop: 4 }}>
                        ID: {cam.camera_id} · Posición: {cam.position || 'N/A'}
                      </div>
                    </div>
                    <button 
                      onClick={() => unassignCamera(selectedVehicle, cam.camera_id)}
                      style={{ 
                        padding: '0.5rem 1rem',
                        background: '#ef4444',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: 14
                      }}
                    >
                      Desasignar
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div>
            <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12 }}>
              Asignar Nueva Cámara
            </h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {availableCameras
                .filter(camId => !vehicleCameras.some(vc => vc.camera_id === camId))
                .map((camId: string) => (
                  <button
                    key={camId}
                    onClick={() => assignCamera(selectedVehicle, camId)}
                    style={{ 
                      padding: '0.5rem 1rem',
                      backgroundColor: '#2563eb',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: 14
                    }}
                  >
                    Asignar {camId}
                  </button>
                ))}
              {availableCameras.filter(camId => !vehicleCameras.some(vc => vc.camera_id === camId)).length === 0 && (
                <p style={{ color: '#6b7280' }}>Todas las cámaras disponibles ya están asignadas</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

