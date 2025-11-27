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
  &:focus {
    outline: none;
    border-color: #4d90fe;
  }
`;

const SuggestionsBox = styled.ul`
  position: absolute;
  left: 0;
  right: 0;
  top: 100%; /* Cambiar de 44px a 100% para que aparezca justo debajo del input */
  background: #fff;
  border: 1px solid #ddd;
  border-radius: 4px;
  border-top: none; /* Quitar border top para que se vea conectado */
  max-height: 220px;
  overflow-y: auto;
  margin: 0;
  padding: 0;
  list-style: none;
  z-index: 9999; /* Aumentar z-index para asegurar que esté por encima */
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
`;

const SuggestionItem = styled.li`
  padding: 8px 10px;
  cursor: pointer;
  border-bottom: 1px solid #f0f0f0;
  &:hover { background: #f7f7f7; }
  &:last-of-type { border-bottom: none; }
`;

const HelperNote = styled.div`
  color: #666;
  font-size: 11px;
  margin-top: 4px;
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
  console.log('[PlaceAutocomplete] 🚀 COMPONENTE INICIADO - Version: TIEMPO REAL SIN BOTONES v3.0');
  const [query, setQuery] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [useGooglePlaces, setUseGooglePlaces] = useState(false);
  const [debouncedQuery, setDebouncedQuery] = useState<string>("");
  const inputRef = useRef<HTMLInputElement>(null);
  const autocomplete = useRef<google.maps.places.Autocomplete | null>(null);
  const API_URL = (import.meta as any).env?.VITE_API_LOGISTICA || 'http://localhost:8001';

  // Configurar para SIEMPRE usar backend optimizado con sugerencias visibles
  useEffect(() => {
    console.log('[PlaceAutocomplete] 🔧 Forzando uso del backend optimizado para máxima compatibilidad');
    
    // FORZAR BACKEND SIEMPRE - ya está super optimizado con Google Places API
    setUseGooglePlaces(false);
    setError(null);
    
    console.log('[PlaceAutocomplete] ✅ Backend optimizado configurado - sugerencias visuales habilitadas');
  }, [googleMapsApiKey, onPlaceSelect]);

  // Debounce del query para búsqueda automática
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300); // Reducir a 300ms para que sea más responsivo

    return () => clearTimeout(timeoutId);
  }, [query]);

  // Ejecutar búsqueda cuando cambie debouncedQuery
  useEffect(() => {
    console.log('[PlaceAutocomplete] 🔄 debouncedQuery useEffect triggered:', {
      debouncedQuery,
      length: debouncedQuery?.length,
      useGooglePlaces,
      shouldExecuteBackendSearch: !useGooglePlaces && debouncedQuery && debouncedQuery.length >= 2
    });
    
    // Clear previous state first
    if (!debouncedQuery || debouncedQuery.length < 2) {
      console.log('[PlaceAutocomplete] 🚫 Clearing suggestions - query too short or empty');
      setSuggestions([]);
      setError(null);
      return;
    }

    // If Google Places is enabled, it will handle suggestions automatically
    // Only use backend search as fallback or when Google Places is not available
    if (!useGooglePlaces) {
      console.log('[PlaceAutocomplete] ✅ Executing backend search for:', debouncedQuery);
      searchPlaces(debouncedQuery);
    } else {
      console.log('[PlaceAutocomplete] ⏭️ Skipping backend search - Google Places is handling autocomplete');
      // Clear any previous backend suggestions since Google Places will provide them
      setSuggestions([]);
    }
  }, [debouncedQuery, useGooglePlaces]);

  const searchPlaces = async (searchQuery: string) => {
    if (!searchQuery || searchQuery.length < 2) {
      setSuggestions([]);
      setError(null);
      return;
    }

    console.log('[PlaceAutocomplete] 🔍 Iniciando búsqueda inteligente para:', searchQuery);
    setLoading(true);
    setError(null);

    try {
      // Strategy 1: Try combined search if we have map context (could be enhanced)
      console.log('[PlaceAutocomplete] 📡 Haciendo request a:', `${API_URL}/maps/geocode`);
      
      const response = await fetch(`${API_URL}/maps/geocode`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: searchQuery })
      });

      console.log('[PlaceAutocomplete] 📥 Response status:', response.status, response.ok);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('[PlaceAutocomplete] 📦 Data recibida:', data);
      
      // Ensure we have an array
      const results = Array.isArray(data) ? data : (data ? [data] : []);
      console.log('[PlaceAutocomplete] 📋 Results array:', results, 'length:', results.length);
      
      const validSuggestions = results
        .filter(item => {
          // Support both formatted_address (Google) and display_name (Nominatim)
          const address = item?.formatted_address || item?.display_name;
          const hasLocation = item?.lat && item?.lng;
          const isValid = hasLocation && address;
          console.log('[PlaceAutocomplete] 🔍 Filtrando item:', {
            lat: item?.lat, 
            lng: item?.lng, 
            address: address?.substring(0, 50) + '...', 
            válido: isValid
          });
          return isValid;
        })
        .slice(0, 5) // Limit to 5 suggestions
        .map(item => ({
          label: item.formatted_address || item.display_name,
          lat: parseFloat(item.lat),
          lng: parseFloat(item.lng)
        }));

      console.log('[PlaceAutocomplete] ✅ Sugerencias válidas:', validSuggestions.length, validSuggestions);
      
      // If we have few results, try to get nearby places for better coverage
      if (validSuggestions.length <= 2 && validSuggestions.length > 0) {
        try {
          console.log('[PlaceAutocomplete] 🎯 Pocas sugerencias, buscando lugares cercanos...');
          const firstResult = validSuggestions[0];
          
          const nearbyResponse = await fetch(`${API_URL}/maps/nearby_search`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              lat: firstResult.lat,
              lng: firstResult.lng,
              radius: 3000,
              keyword: searchQuery
            })
          });

          if (nearbyResponse.ok) {
            const nearbyData = await nearbyResponse.json();
            console.log('[PlaceAutocomplete] 🏪 Nearby results:', nearbyData?.length || 0);
            
            if (Array.isArray(nearbyData) && nearbyData.length > 0) {
              const nearbyPlaces = nearbyData.slice(0, 3).map(place => ({
                label: `${place.name} - ${place.vicinity || place.formatted_address}`,
                lat: place.lat,
                lng: place.lng
              }));
              
              // Combine results, putting nearby places first for better relevance
              const combinedSuggestions = [...nearbyPlaces, ...validSuggestions]
                .slice(0, 5); // Limit to 5 total
              
              console.log('[PlaceAutocomplete] 🔄 Combinando resultados:', combinedSuggestions.length);
              setSuggestions(combinedSuggestions);
            } else {
              setSuggestions(validSuggestions);
            }
          } else {
            setSuggestions(validSuggestions);
          }
        } catch (nearbyError) {
          console.warn('[PlaceAutocomplete] ⚠️ Nearby search failed:', nearbyError);
          setSuggestions(validSuggestions);
        }
      } else {
        setSuggestions(validSuggestions);
      }

      // Only set error if we have NO valid suggestions
      if (validSuggestions.length === 0) {
        setError(`No se encontraron lugares para: ${searchQuery}`);
      } else {
        setError(null); // Clear any previous error
      }

    } catch (err) {
      console.error('[PlaceAutocomplete] ❌ Error en búsqueda:', err);
      setError(`Error al buscar lugares: ${String(err)}`);
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  };

  const selectSuggestion = (suggestion: Suggestion) => {
    const place: google.maps.places.PlaceResult = {
      formatted_address: suggestion.label,
      geometry: {
        location: {
          lat: () => suggestion.lat,
          lng: () => suggestion.lng,
        } as unknown as google.maps.LatLng,
      } as google.maps.places.PlaceGeometry,
    };

    onPlaceSelect(place);
    setQuery(suggestion.label);
    setSuggestions([]);
    setError(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !useGooglePlaces) {
      e.preventDefault();
      if (query && query.length >= 2) {
        searchPlaces(query);
      }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    console.log('[PlaceAutocomplete] Input changed:', value, 'useGooglePlaces:', useGooglePlaces);
    setQuery(value);
    
    if (error) setError(null);
    
    // Las sugerencias se manejan automáticamente con el useEffect de debouncedQuery
    console.log('[PlaceAutocomplete] Query actualizado a:', value, 'Debounce se ejecutará en 300ms');
  };

  return (
    <div>
      <SearchContainer>
        <Input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={query} // Siempre usar nuestro valor controlado
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          autoComplete="off"
        />
        {suggestions.length > 0 && (
          <SuggestionsBox>
            {suggestions.map((suggestion, idx) => (
              <SuggestionItem 
                key={idx} 
                onClick={() => selectSuggestion(suggestion)}
              >
                {suggestion.label}
              </SuggestionItem>
            ))}
          </SuggestionsBox>
        )}
      </SearchContainer>
      {error && <ErrorMessage>{error}</ErrorMessage>}
    </div>
  );
});

PlaceAutocomplete.displayName = 'PlaceAutocomplete';

export default PlaceAutocomplete;