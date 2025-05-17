'use client';

import { useRef, useEffect, useState } from 'react';
import { initGoogleMapsLoader } from '@/lib/google-maps-loader';

// Check if we're in a browser environment
const isBrowser = typeof window !== 'undefined';

type MapComponentProps = {
  center: { lat: number; lng: number };
  zoom?: number;
  markers?: Array<{
    position: { lat: number; lng: number };
    title?: string;
    icon?: string;
  }>;
  onClick?: (e: google.maps.MapMouseEvent) => void;
};

const MapComponent: React.FC<MapComponentProps> = ({
  center,
  zoom = 10,
  markers = [],
  onClick
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const [mapInstance, setMapInstance] = useState<google.maps.Map | null>(null);
  const [mapMarkers, setMapMarkers] = useState<google.maps.Marker[]>([]);
  
  // Initialize map
  useEffect(() => {
    // Skip this effect entirely on server-side
    if (!isBrowser) return;
    
    let isMounted = true;
    let map: google.maps.Map | null = null;
    
    const initMap = async () => {
      try {
        await initGoogleMapsLoader();
        
        if (mapRef.current && isMounted) {
          map = new google.maps.Map(mapRef.current, {
            center,
            zoom,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: false,
            styles: [
              // Custom map style with panda-friendly colors
              {
                featureType: "water",
                elementType: "geometry",
                stylers: [{ color: "#87CEEB" }]
              },
              {
                featureType: "landscape",
                elementType: "geometry",
                stylers: [{ color: "#F5F5DC" }]
              },
              {
                featureType: "poi.park",
                elementType: "geometry",
                stylers: [{ color: "#4CAF50" }]
              }
            ]
          });
          
          if (onClick) {
            map.addListener('click', onClick);
          }
          
          setMapInstance(map);
        }
      } catch (error) {
        console.error('Error initializing map:', error);
      }
    };
    
    initMap();
    
    return () => {
      isMounted = false;
      if (map && onClick) {
        google.maps.event.clearListeners(map, 'click');
      }
    };
  }, []);
  
  // Update center and zoom when props change
  useEffect(() => {
    // Skip this effect entirely on server-side
    if (!isBrowser) return;
    
    if (mapInstance) {
      mapInstance.setCenter(center);
      mapInstance.setZoom(zoom);
    }
  }, [center, zoom, mapInstance]);
  
  // Update markers when they change
  useEffect(() => {
    // Skip this effect entirely on server-side
    if (!isBrowser) return;
    
    // Clear existing markers
    mapMarkers.forEach(marker => marker.setMap(null));
    
    if (!mapInstance) return;
    
    // Create new markers
    const newMarkers = markers.map(markerData => {
      const marker = new google.maps.Marker({
        position: markerData.position,
        map: mapInstance,
        title: markerData.title,
        icon: markerData.icon || {
          path: google.maps.SymbolPath.CIRCLE,
          fillColor: '#FF9D2F',
          fillOpacity: 0.9,
          strokeWeight: 2,
          strokeColor: '#FFFFFF',
          scale: 8
        },
        animation: google.maps.Animation.DROP
      });
      
      return marker;
    });
    
    setMapMarkers(newMarkers);
    
    // Clean up markers on unmount
    return () => {
      newMarkers.forEach(marker => marker.setMap(null));
    };
  }, [markers, mapInstance]);
  
  // If we're on the server, return an empty placeholder to avoid hydration issues
  if (!isBrowser) {
    return (
      <div style={{ width: '100%', height: '100%', borderRadius: '0.375rem', background: '#F5F5DC' }}></div>
    );
  }
  
  return (
    <div ref={mapRef} style={{ width: '100%', height: '100%', borderRadius: '0.375rem' }}></div>
  );
};

export default MapComponent;
