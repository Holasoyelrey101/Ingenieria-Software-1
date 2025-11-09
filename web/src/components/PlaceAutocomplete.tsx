/// <reference types="@types/google.maps" />
import React, { useEffect, useRef, useState } from 'react';
import styled from '@emotion/styled';

interface PlaceAutocompleteProps {
  onPlaceSelect: (place: google.maps.places.PlaceResult) => void;
  googleMapsApiKey: string;
  placeholder?: string;
}

interface Suggestion {
  label: string;
  lat: number;
  lng: number;
}

const SearchContainer = styled.div`
  width: 100%;
  background: white;
  border-radius: 4px;
  margin-bottom: 10px;
  box-shadow: 0 1px 4px -1px rgba(0, 0, 0, 0.3);
  font-family: Roboto, Arial, sans-serif;
  position: relative;
`;

const Input = styled.input`
  width: 100%;
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
  box-sizing: border-box;
  font-size: 14px;
  padding-right: 80px; /* espacio para el botón interno */
  &:focus {
    outline: none;
    border-color: #4d90fe;
  }
`;

const SearchButton = styled.button`
  position: absolute;
  top: 6px;
  right: 6px;
  background: #4d90fe;
  color: #fff;
  border: none;
  border-radius: 4px;
  padding: 6px 10px;
  font-size: 13px;
  cursor: pointer;
  z-index: 2;
  &:hover { background: #357ae8; }
`;

const HelperNote = styled.div`
  color: #666;
  font-size: 11px;
  margin-top: 4px;
`;

const SuggestionsBox = styled.ul`
  position: absolute;
  left: 0;
  right: 0;
  top: 44px; /* roughly below input */
  background: #fff;
  border: 1px solid #ddd;
  border-radius: 4px;
  max-height: 220px;
  overflow-y: auto;
  margin: 4px 0 0 0;
  padding: 0;
  list-style: none;
  z-index: 5;
`;

const SuggestionItem = styled.li`
  padding: 8px 10px;
  cursor: pointer;
  border-bottom: 1px solid #f0f0f0;
  &:hover { background: #f7f7f7; }
  &:last-of-type { border-bottom: none; }
`;

const ErrorMessage = styled.div`
  color: red;
  font-size: 12px;
  margin-top: 4px;
`;

const PlaceAutocomplete = React.memo(({
  onPlaceSelect,
  googleMapsApiKey,
  placeholder = "Buscar lugar..."
}: PlaceAutocompleteProps) => {
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteService = useRef<google.maps.places.AutocompleteService | null>(null);
  const placesService = useRef<google.maps.places.PlacesService | null>(null);
  const API_URL = (import.meta as any).env?.VITE_API_URL || `${location.protocol}//${location.hostname}:8000`;
  const [hasPlacesLib, setHasPlacesLib] = useState<boolean>(false);

  useEffect(() => {
    if (!googleMapsApiKey) {
      setError('API key es requerida');
      return;
    }

    const initialize = () => {
      try {
        console.info('[PlaceAutocomplete] init — checking Places lib availability');
        // Backend-first strategy: we no longer instantiate deprecated Google services for new customers.
        // We only detect availability for telemetry purposes, but keep services null to avoid deprecation paths.
        const available = Boolean(window.google?.maps?.places);
        setHasPlacesLib(available);
        autocompleteService.current = null;
        placesService.current = null;
      } catch (err) {
        setError('Error al inicializar servicios de Google Maps');
        console.error('Error:', err);
      }
    };

    initialize();
  }, [googleMapsApiKey]);

  const selectSuggestion = (s: Suggestion) => {
    const place: google.maps.places.PlaceResult = {
      formatted_address: s.label,
      geometry: {
        location: {
          lat: () => s.lat,
          lng: () => s.lng,
        } as unknown as google.maps.LatLng,
      } as google.maps.places.PlaceGeometry,
    } as google.maps.places.PlaceResult;
    onPlaceSelect(place);
    setQuery(s.label);
    setSuggestions([]);
    setError(null);
  };

  const handleSearch = async () => {
    console.info('[PlaceAutocomplete] handleSearch called. query=', query);
    if (!query) {
      console.warn('[PlaceAutocomplete] empty query — not searching');
      setError('Escribe una dirección y presiona Enter');
      return;
    }

    // helper: backend geocode fallback
    const fallbackFetch = async (): Promise<void> => {
      console.debug('[Autocomplete fallback] POST', `${API_URL}/maps/geocode`, 'query=', query);
      setLoading(true);
      const res = await fetch(`${API_URL}/maps/geocode`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: query })
      });
      const raw = await res.text();
      setLoading(false);
      if (!res.ok) throw new Error(raw || `HTTP ${res.status}`);
      let data: any;
      try { data = JSON.parse(raw); } catch { data = raw; }
      const arr = Array.isArray(data) ? data : (data ? [data] : []);
      const sugg: Suggestion[] = arr.map((it: any) => ({
        label: it.formatted_address || it.display_name || query,
        lat: Number(it.lat),
        lng: Number(it.lng),
      })).filter(s => isFinite(s.lat) && isFinite(s.lng));
      if (sugg.length === 0) {
        throw new Error('No se encontraron resultados');
      }
      if (sugg.length === 1) {
        selectSuggestion(sugg[0]);
      } else {
        setSuggestions(sugg);
        setError(null);
      }
    };

    // Backend-first: intentar primero el backend para evitar APIs deprecated de Google.
    try {
      await fallbackFetch();
      return; // éxito
    } catch (err) {
      console.warn('[PlaceAutocomplete] backend fallback falló, intentaremos Google si está disponible…', err);
    }

    // Si quieres intentar Google como segunda opción (cuando disponible), descomenta la siguiente sección.
    // if (!autocompleteService.current && !placesService.current) {
    //   return; // no hay servicios de Google inicializados
    // }

    try {
      // Google predictions deshabilitado por defecto (servicios no instanciados)
      // Mantener esta ruta comentada hasta migrar a AutocompleteSuggestion/Place API modernas.
      // await fallbackFetch(); // ya intentado arriba
    } catch (err) {
      const msg = (err as any)?.message || String(err);
      setError(`Servicio de autocompletado no disponible: ${msg}`);
      console.error('Búsqueda falló:', err);
    }
  };

  const getPlaceDetails = (placeId: string): Promise<google.maps.places.PlaceResult> => {
    return new Promise((resolve, reject) => {
      if (!placesService.current) {
        reject(new Error('Servicio de Places no inicializado'));
        return;
      }

      placesService.current.getDetails(
        {
          placeId: placeId,
          fields: ['geometry', 'formatted_address', 'name']
        },
        (result, status) => {
          if (status === google.maps.places.PlacesServiceStatus.OK && result) {
            resolve(result);
          } else {
            reject(status);
          }
        }
      );
    });
  };

  return (
    <div>
      <SearchContainer>
        <Input
          id={placeholder.includes('origen') ? 'origin-input' : placeholder.includes('destino') ? 'destination-input' : 'place-input'}
          name={placeholder.includes('origen') ? 'origin' : placeholder.includes('destino') ? 'destination' : 'place'}
          ref={inputRef}
          type="text"
          autoComplete={placeholder.includes('origen') || placeholder.includes('destino') ? 'street-address' : 'on'}
          placeholder={placeholder}
          value={query}
          onChange={(e) => { setQuery(e.target.value); if (error) setError(null); }}
          onKeyDown={(e) => { 
            console.debug('[PlaceAutocomplete] keyDown:', e.key);
            if (e.key === 'Enter') { e.preventDefault(); handleSearch(); }
          }}
        />
        <SearchButton type="button" onClick={handleSearch} aria-label="Buscar">
          Buscar
        </SearchButton>
        {suggestions.length > 0 && (
          <SuggestionsBox role="listbox">
            {suggestions.map((s, idx) => (
              <SuggestionItem key={idx} role="option" onClick={() => selectSuggestion(s)}>
                {s.label}
              </SuggestionItem>
            ))}
          </SuggestionsBox>
        )}
      </SearchContainer>
      <HelperNote>
        Places: {String(hasPlacesLib)} · API: {googleMapsApiKey ? 'ok' : 'missing'}
      </HelperNote>
      {!hasPlacesLib && !error && (
        <HelperNote>Sugerencias de Google no disponibles; usando búsqueda básica.</HelperNote>
      )}
      {error && <ErrorMessage>{error}</ErrorMessage>}
    </div>
  );
});

PlaceAutocomplete.displayName = 'PlaceAutocomplete';

export default PlaceAutocomplete;
