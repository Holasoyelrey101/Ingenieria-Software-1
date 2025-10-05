import React, { useCallback, useState } from 'react'
import { GoogleMap, LoadScript, Marker, Polyline, Libraries } from '@react-google-maps/api'
import PlaceAutocomplete from './components/PlaceAutocomplete'
import axios from 'axios'

// Ensure Google Maps types are available
/// <reference types="@types/google.maps" />

// Configuración de Google Maps
const libraries: Libraries = ['places']
const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY
if (!GOOGLE_MAPS_API_KEY) {
  console.error('Google Maps API Key no encontrada. Por favor configura VITE_GOOGLE_MAPS_API_KEY en tu archivo .env')
  throw new Error('Google Maps API Key es requerida')
}
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const containerStyle = {
  width: '100%',
  height: '100%'
}

const defaultCenter = { lat: -33.45, lng: -70.66 } // Santiago, Chile

interface LatLng {
  lat: number;
  lng: number;
}

interface Vehicle {
  id: string;
  name: string;
  currentLocation?: string;
  route?: {
    coords: LatLng[];
    distance_m: number;
    duration_s: number;
  };
}

interface RouteRequest {
  vehicleId: string;
  origin: string;
  destination: string;
  waypoints?: string[];
  timestamp: number;
  status?: string;
}

interface PlaceLocation {
  lat: number;
  lng: number;
}

interface ExtendedPlaceResult {
  geometry?: google.maps.places.PlaceGeometry;
  formatted_address: string;
  location?: PlaceLocation;
}

function decodePolyline(encoded: string) {
  let index = 0, lat = 0, lng = 0, coordinates: any[] = [];
  while (index < encoded.length) {
    let b, shift = 0, result = 0;
    do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    const dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lat += dlat;
    shift = 0; result = 0;
    do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    const dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lng += dlng;
    coordinates.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }
  return coordinates;
}

export default function MapView() {
  const [map, setMap] = useState<google.maps.Map | null>(null)
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [selectedVehicle, setSelectedVehicle] = useState<string | null>(null)
  const [originPlace, setOriginPlace] = useState<ExtendedPlaceResult | null>(null)
  const [destPlace, setDestPlace] = useState<ExtendedPlaceResult | null>(null)
  const [route, setRoute] = useState<{coords: google.maps.LatLngLiteral[]; distance_m: number; duration_s: number} | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [requests, setRequests] = useState<RouteRequest[]>([])
  const [waypointsInput, setWaypointsInput] = useState<string>('')
  const [isMapLoaded, setIsMapLoaded] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [mapsLoaded, setMapsLoaded] = useState(false)
  
  const onLoad = useCallback(function callback(mapInstance: google.maps.Map) {
    setMap(mapInstance)
    setIsMapLoaded(true)
  }, [])

  const onUnmount = useCallback(function callback() {
    setMap(null)
    setIsMapLoaded(false)
  }, [])

  const handleOriginPlaceSelect = (place: google.maps.places.PlaceResult) => {
    if (place.formatted_address && place.geometry?.location) {
      const location: PlaceLocation = {
        lat: place.geometry.location.lat(),
        lng: place.geometry.location.lng()
      };
      setOriginPlace({
        geometry: place.geometry,
        formatted_address: place.formatted_address,
        location
      });
    }
  }

  const handleDestPlaceSelect = (place: google.maps.places.PlaceResult) => {
    if (place.formatted_address && place.geometry?.location) {
      const location: PlaceLocation = {
        lat: place.geometry.location.lat(),
        lng: place.geometry.location.lng()
      };
      setDestPlace({
        geometry: place.geometry,
        formatted_address: place.formatted_address,
        location
      });
    }
  }

  const addVehicle = () => {
    const id = `vehicle-${vehicles.length + 1}`
    const name = `Vehículo ${vehicles.length + 1}`
    setVehicles([...vehicles, { id, name }])
  }

  const computeRoute = async () => {
    setError(null)
    if (!originPlace?.formatted_address || !destPlace?.formatted_address) {
      setError('Por favor selecciona una dirección de origen y destino válidas')
      return
    }
    
    if (!selectedVehicle) {
      setError('Por favor selecciona un vehículo para asignar la ruta')
      return
    }

    const waypoints = waypointsInput
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)

    const payload = {
      origin: originPlace.formatted_address,
      destination: destPlace.formatted_address,
      waypoints,
      vehicleId: selectedVehicle,
      optimize: true
    }

    try {
      console.log('Calculando ruta:', payload)
      const res = await axios.post(API_URL + '/maps/directions', payload)
      const poly = res.data.polyline
      const coords = decodePolyline(poly)
      
      const routeInfo = {
        coords,
        distance_m: res.data.distance_m,
        duration_s: res.data.duration_s,
        waypoints: res.data.waypoints || []
      }

      setRoute(routeInfo)
      
      // Actualizar el vehículo con su nueva ruta
      setVehicles(vehicles.map(v => 
        v.id === selectedVehicle 
          ? { ...v, route: routeInfo, currentLocation: originPlace.formatted_address }
          : v
      ))

      if(coords.length > 0 && map){
        const bounds = new window.google.maps.LatLngBounds()
        coords.forEach((p:any) => bounds.extend(p))
        map.fitBounds(bounds)
      }

      // Guardar la solicitud
      const newRequest: RouteRequest = {
        vehicleId: selectedVehicle,
        origin: originPlace.formatted_address,
        destination: destPlace.formatted_address,
        waypoints,
        timestamp: Date.now(),
        status: 'completed'
      }
      setRequests([newRequest, ...requests])

    } catch(e:any) {
      console.error('Error al calcular ruta:', e)
      setError(e?.response?.data || e.message)
    }
  }

  return (
    <div style={{ display: 'flex', height: '100%' }}>
      <div style={{ width: 360, padding: 12, boxSizing: 'border-box' }}>
        <div style={{ marginBottom: '10px' }}>
          <button onClick={addVehicle}>Agregar Vehículo</button>
          {vehicles.length > 0 && (
            <select 
              value={selectedVehicle || ''} 
              onChange={(e) => setSelectedVehicle(e.target.value)}
              style={{ marginLeft: '10px' }}
            >
              <option value="">Seleccionar vehículo...</option>
              {vehicles.map(v => (
                <option key={v.id} value={v.id}>{v.name}</option>
              ))}
            </select>
          )}
        </div>

        <div>
          <h4>Origen</h4>
          <PlaceAutocomplete
            onPlaceSelect={handleOriginPlaceSelect}
            googleMapsApiKey={GOOGLE_MAPS_API_KEY || ''}
            placeholder="Buscar dirección de origen..."
          />

          <h4>Destino</h4>
          <PlaceAutocomplete
            onPlaceSelect={handleDestPlaceSelect}
            googleMapsApiKey={GOOGLE_MAPS_API_KEY || ''}
            placeholder="Buscar dirección de destino..."
          />

          <h4>Paradas intermedias (opcional)</h4>
          <textarea
            value={waypointsInput}
            onChange={(e) => setWaypointsInput(e.target.value)}
            placeholder="Una dirección por línea"
            style={{ width: '100%', minHeight: '80px' }}
          />

          <button 
            onClick={computeRoute} 
            disabled={!originPlace || !destPlace || !selectedVehicle}
            style={{ marginTop: '10px' }}
          >
            Calcular ruta
          </button>

          {error && (
            <div style={{ color: 'red', marginTop: '10px' }}>
              {error}
            </div>
          )}

          {route && (
            <div style={{ marginTop: '10px' }}>
              <h4>Detalles de la ruta:</h4>
              <p>Distancia: {(route.distance_m/1000).toFixed(2)} km</p>
              <p>Duración estimada: {Math.round(route.duration_s/60)} minutos</p>
            </div>
          )}
        </div>

        <div style={{ marginTop: '20px' }}>
          <h4>Solicitudes de ruta</h4>
          <div style={{ maxHeight: '200px', overflow: 'auto' }}>
            {requests.map((req, index) => (
              <div key={index} style={{ padding: '10px', borderBottom: '1px solid #eee' }}>
                <div><strong>Vehículo:</strong> {vehicles.find(v => v.id === req.vehicleId)?.name || req.vehicleId}</div>
                <div><strong>Origen:</strong> {req.origin}</div>
                <div><strong>Destino:</strong> {req.destination}</div>
                <div><strong>Estado:</strong> {req.status}</div>
                <div><small>{new Date(req.timestamp).toLocaleString()}</small></div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ flex: 1 }}>
        <LoadScript googleMapsApiKey={GOOGLE_MAPS_API_KEY as string} libraries={libraries}>
          <GoogleMap
            mapContainerStyle={containerStyle}
            center={defaultCenter}
            zoom={12}
            onLoad={onLoad}
            onUnmount={onUnmount}
            options={{
              zoomControl: true,
              mapTypeControl: true,
              scaleControl: true,
              streetViewControl: true,
              rotateControl: true,
              fullscreenControl: true
            }}
          >
            {originPlace?.location && (
              <Marker
                position={originPlace.location}
                title="Origen"
              />
            )}
            {destPlace?.location && (
              <Marker
                position={destPlace.location}
                title="Destino"
              />
            )}
            {route && (
              <Polyline
                path={route.coords}
                options={{
                  strokeColor: '#1976D2',
                  strokeWeight: 4
                }}
              />
            )}
          </GoogleMap>
        </LoadScript>
      </div>
    </div>
  )
}