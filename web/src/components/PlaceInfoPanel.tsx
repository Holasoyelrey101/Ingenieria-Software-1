/// <reference types="@types/google.maps" />
import React, { useState, useEffect } from 'react';
import styled from '@emotion/styled';

interface PlaceInfo {
  place_id?: string;
  name?: string;
  formatted_address?: string;
  formatted_phone_number?: string;
  rating?: number;
  user_ratings_total?: number;
  opening_hours?: {
    open_now?: boolean;
    weekday_text?: string[];
  };
  website?: string;
  photos?: Array<{
    photo_reference: string;
    height: number;
    width: number;
  }>;
  geometry?: {
    location?: {
      lat: number;
      lng: number;
    };
  };
  types?: string[];
}

interface PlaceInfoPanelProps {
  placeId?: string | null;
  placeData?: PlaceInfo | null; // Agregar soporte para datos directos
  onClose: () => void;
  googleMapsApiKey: string;
}

const Panel = styled.div`
  position: absolute;
  left: 20px;
  top: 80px;
  width: 350px;
  max-height: calc(100vh - 100px);
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  overflow: hidden;
  z-index: 1000;
  font-family: 'Roboto', Arial, sans-serif;
`;

const Header = styled.div`
  position: relative;
  height: 200px;
  background: #f0f0f0;
  overflow: hidden;
`;

const PlaceImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

const CloseButton = styled.button`
  position: absolute;
  top: 12px;
  right: 12px;
  background: rgba(255, 255, 255, 0.9);
  border: none;
  border-radius: 50%;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 18px;
  font-weight: bold;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  
  &:hover {
    background: white;
  }
`;

const Content = styled.div`
  padding: 16px;
`;

const PlaceName = styled.h2`
  margin: 0 0 8px 0;
  font-size: 24px;
  font-weight: 400;
  color: #202124;
`;

const Rating = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 12px;
  gap: 8px;
`;

const Stars = styled.div`
  color: #fbbc04;
  font-size: 16px;
`;

const RatingText = styled.span`
  font-size: 14px;
  color: #70757a;
`;

const Address = styled.div`
  color: #70757a;
  font-size: 14px;
  margin-bottom: 16px;
  line-height: 1.4;
`;

const InfoRow = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 12px;
  font-size: 14px;
  gap: 12px;
`;

const InfoIcon = styled.span`
  color: #70757a;
  width: 20px;
  text-align: center;
`;

const InfoText = styled.span`
  color: #202124;
`;

const ActionButton = styled.button`
  width: 100%;
  padding: 12px;
  background: #1a73e8;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  margin-top: 16px;
  
  &:hover {
    background: #1557b0;
  }
`;

const LoadingState = styled.div`
  padding: 40px;
  text-align: center;
  color: #70757a;
`;

const ErrorState = styled.div`
  padding: 40px;
  text-align: center;
  color: #d93025;
`;

const PlaceInfoPanel: React.FC<PlaceInfoPanelProps> = ({ placeId, placeData, onClose, googleMapsApiKey }) => {
  const [placeInfo, setPlaceInfo] = useState<PlaceInfo | null>(placeData || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (placeData) {
      setPlaceInfo(placeData);
      return;
    }

    if (!placeId || !googleMapsApiKey) return;

    fetchPlaceDetails(placeId);
  }, [placeId, placeData, googleMapsApiKey]);

  const fetchPlaceDetails = async (id: string) => {
    setLoading(true);
    setError(null);

    try {
      // Use our backend endpoint instead of direct Google API call
      const API_LOGISTICA = import.meta.env.VITE_API_LOGISTICA || 'http://localhost:8001';
      const response = await fetch(`${API_LOGISTICA}/maps/place-details`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ place_id: id }),
      });

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setPlaceInfo(data);
    } catch (err) {
      console.error('Error fetching place details:', err);
      setError('Error al cargar información del lugar');
    } finally {
      setLoading(false);
    }
  };

  const getPhotoUrl = (photoReference: string, maxWidth: number = 350) => {
    return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${maxWidth}&photo_reference=${photoReference}&key=${googleMapsApiKey}`;
  };

  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;

    for (let i = 0; i < fullStars; i++) {
      stars.push('★');
    }
    if (hasHalfStar) {
      stars.push('☆');
    }
    while (stars.length < 5) {
      stars.push('☆');
    }

    return stars.join('');
  };

  const getOpenStatus = () => {
    if (!placeInfo?.opening_hours) return null;
    
    return placeInfo.opening_hours.open_now ? 'Abierto' : 'Cerrado';
  };

  const getPlaceType = () => {
    if (!placeInfo?.types) return 'Lugar';
    
    const typeMap: { [key: string]: string } = {
      restaurant: 'Restaurante',
      tourist_attraction: 'Atracción turística',
      park: 'Parque',
      museum: 'Museo',
      shopping_mall: 'Centro comercial',
      hospital: 'Hospital',
      school: 'Escuela',
      bank: 'Banco',
      gas_station: 'Estación de servicio',
      store: 'Tienda'
    };

    const primaryType = placeInfo.types.find(type => typeMap[type]);
    return primaryType ? typeMap[primaryType] : 'Lugar';
  };

  if (!placeId && !placeData) return null;

  return (
    <Panel>
      <Header>
        {placeInfo?.photos && placeInfo.photos.length > 0 ? (
          <PlaceImage 
            src={getPhotoUrl(placeInfo.photos[0].photo_reference)} 
            alt={placeInfo.name || 'Place'} 
          />
        ) : (
          <div style={{ 
            height: '100%', 
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: '48px'
          }}>
            📍
          </div>
        )}
        <CloseButton onClick={onClose}>
          ×
        </CloseButton>
      </Header>

      <Content>
        {loading && <LoadingState>Cargando información...</LoadingState>}
        
        {error && <ErrorState>{error}</ErrorState>}
        
        {placeInfo && (
          <>
            <PlaceName>{placeInfo.name}</PlaceName>
            
            {placeInfo.rating && (
              <Rating>
                <Stars>{renderStars(placeInfo.rating)}</Stars>
                <RatingText>
                  {placeInfo.rating} ({placeInfo.user_ratings_total || 0} reseñas)
                </RatingText>
              </Rating>
            )}

            <Address>{placeInfo.formatted_address}</Address>

            <InfoRow>
              <InfoIcon>🏷️</InfoIcon>
              <InfoText>{getPlaceType()}</InfoText>
            </InfoRow>

            {placeInfo.formatted_phone_number && (
              <InfoRow>
                <InfoIcon>📞</InfoIcon>
                <InfoText>{placeInfo.formatted_phone_number}</InfoText>
              </InfoRow>
            )}

            {getOpenStatus() && (
              <InfoRow>
                <InfoIcon>🕒</InfoIcon>
                <InfoText style={{ 
                  color: getOpenStatus() === 'Abierto' ? '#137333' : '#d93025' 
                }}>
                  {getOpenStatus()}
                </InfoText>
              </InfoRow>
            )}

            {placeInfo.website && (
              <InfoRow>
                <InfoIcon>🌐</InfoIcon>
                <InfoText>
                  <a 
                    href={placeInfo.website} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    style={{ color: '#1a73e8', textDecoration: 'none' }}
                  >
                    Sitio web
                  </a>
                </InfoText>
              </InfoRow>
            )}

            <ActionButton onClick={() => {
              if (placeInfo.geometry?.location) {
                const { lat, lng } = placeInfo.geometry.location;
                window.open(`https://maps.google.com/maps?q=${lat},${lng}`, '_blank');
              }
            }}>
              📍 Ver en Google Maps
            </ActionButton>
          </>
        )}
      </Content>
    </Panel>
  );
};

export default PlaceInfoPanel;