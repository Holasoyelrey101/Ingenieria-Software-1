import React, { useEffect, useState } from 'react';

const TestGooglePlaces: React.FC = () => {
  const [status, setStatus] = useState<string>('Verificando...');

  useEffect(() => {
    const checkGoogleMaps = () => {
      if (window.google?.maps) {
        setStatus('✅ Google Maps cargado');
        
        if (window.google.maps.places) {
          setStatus(prev => prev + '\n✅ Google Places API disponible');
          
          // Probar crear un servicio de autocompletado
          try {
            const testElement = document.createElement('input');
            const autocomplete = new window.google.maps.places.Autocomplete(testElement);
            setStatus(prev => prev + '\n✅ Autocomplete se puede inicializar');
          } catch (err) {
            setStatus(prev => prev + '\n❌ Error al inicializar Autocomplete: ' + String(err));
          }
        } else {
          setStatus(prev => prev + '\n❌ Google Places API NO disponible');
        }
      } else {
        setStatus('❌ Google Maps NO cargado');
        // Reintentar en 2 segundos
        setTimeout(checkGoogleMaps, 2000);
      }
    };

    checkGoogleMaps();
  }, []);

  return (
    <div style={{ 
      position: 'fixed', 
      top: 10, 
      right: 10, 
      background: 'white', 
      padding: 10, 
      border: '1px solid #ccc',
      borderRadius: 4,
      fontSize: 12,
      maxWidth: 300,
      whiteSpace: 'pre-line',
      zIndex: 1000
    }}>
      <strong>Test Google Places:</strong><br />
      {status}
    </div>
  );
};

export default TestGooglePlaces;