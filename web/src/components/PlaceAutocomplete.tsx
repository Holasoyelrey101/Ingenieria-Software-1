/// <reference types="@types/google.maps" />
import React, { useEffect, useRef, useState } from 'react';
import styled from '@emotion/styled';

interface PlaceAutocompleteProps {
  onPlaceSelect: (place: google.maps.places.PlaceResult) => void;
  googleMapsApiKey: string;
  placeholder?: string;
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
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteService = useRef<google.maps.places.AutocompleteService | null>(null);
  const placesService = useRef<google.maps.places.PlacesService | null>(null);

  useEffect(() => {
    if (!googleMapsApiKey) {
      setError('API key es requerida');
      return;
    }

    const initialize = () => {
      try {
        if (window.google?.maps) {
          autocompleteService.current = new window.google.maps.places.AutocompleteService();
          const mapDiv = document.createElement('div');
          placesService.current = new window.google.maps.places.PlacesService(mapDiv);
        }
      } catch (err) {
        setError('Error al inicializar servicios de Google Maps');
        console.error('Error:', err);
      }
    };

    initialize();
  }, [googleMapsApiKey]);

  const handleSearch = async () => {
    if (!query) return;

    if (!autocompleteService.current) {
      setError('Servicio de autocompletado no disponible');
      return;
    }

    try {
      const request: google.maps.places.AutocompletionRequest = {
        input: query,
        componentRestrictions: { country: 'cl' }
      };

      const predictions = await new Promise<google.maps.places.AutocompletePrediction[]>(
        (resolve, reject) => {
          autocompleteService.current?.getPlacePredictions(
            request,
            (results, status) => {
              if (status === google.maps.places.PlacesServiceStatus.OK && results) {
                resolve(results);
              } else {
                reject(status);
              }
            }
          );
        }
      );

      if (predictions.length > 0) {
        const details = await getPlaceDetails(predictions[0].place_id);
        onPlaceSelect(details);
      }
    } catch (err) {
      setError('Error al buscar lugares');
      console.error('Error:', err);
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
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
        />
      </SearchContainer>
      {error && <ErrorMessage>{error}</ErrorMessage>}
    </div>
  );
});

PlaceAutocomplete.displayName = 'PlaceAutocomplete';

export default PlaceAutocomplete;
