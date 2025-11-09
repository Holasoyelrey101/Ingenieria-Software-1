import React, { useEffect, useState } from 'react';
import VideoHLS from './VideoHLS';

interface VehicleCameraViewProps {
  vehicleId: number;
}

interface Camera {
  id: number;
  camera_id: string;
  camera_name: string;
  position: string;
  stream_url?: string;
  active: boolean;
}

export function VehicleCameraView({ vehicleId }: VehicleCameraViewProps) {
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  
  useEffect(() => {
    loadCameras();
  }, [vehicleId]);
  
  const loadCameras = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`${apiUrl}/camaras/vehicles/${vehicleId}/cameras`);
      if (!res.ok) {
        throw new Error('Error al cargar cámaras');
      }
      const data = await res.json();
      setCameras(data.cameras || []);
    } catch (error) {
      console.error('Error cargando cámaras:', error);
      setError('Error al cargar las cámaras del vehículo');
    } finally {
      setLoading(false);
    }
  };
  
  if (loading) {
    return (
      <div style={{ minHeight: '40vh', display: 'grid', placeItems: 'center' }}>
        Cargando cámaras...
      </div>
    );
  }
  
  if (error) {
    return (
      <div style={{ minHeight: '40vh', display: 'grid', placeItems: 'center', color: '#b91c1c' }}>
        ⚠️ {error}
      </div>
    );
  }
  
  if (cameras.length === 0) {
    return (
      <div style={{ minHeight: '40vh', display: 'grid', placeItems: 'center', color: '#6b7280' }}>
        Este vehículo no tiene cámaras asignadas
      </div>
    );
  }
  
  return (
    <div style={{ maxWidth: 1400, margin: '0 auto', padding: '24px 16px' }}>
      <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 16 }}>
        Cámaras del Vehículo
      </h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: 20 }}>
        {cameras.map((cam) => {
          // Usar stream_url si está disponible, sino construir desde el endpoint
          const hlsUrl = cam.stream_url || `${apiUrl}/camaras/hls/${cam.camera_id}`;
          return (
            <VideoHLS
              key={cam.id}
              camId={cam.camera_id}
              hlsUrl={hlsUrl}
              title={cam.camera_name || `Cámara ${cam.camera_id} - ${cam.position}`}
            />
          );
        })}
      </div>
    </div>
  );
}

