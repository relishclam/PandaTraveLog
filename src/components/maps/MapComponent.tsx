'use client';

import { useRef, useEffect, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

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
  onClick?: (e: { lat: number; lng: number }) => void;
};

// Map marker interface specific to Geoapify
interface MapMarker {
  element: HTMLElement;
  remove: () => void;
}

const MapComponent: React.FC<MapComponentProps> = ({
  center,
  zoom = 10,
  markers = [],
  onClick
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const [mapInstance, setMapInstance] = useState<any>(null);
  const [mapMarkers, setMapMarkers] = useState<MapMarker[]>([]);
  // Initialize the map
  useEffect(() => {
    // Skip this effect entirely on server-side
    if (!isBrowser) return;
    
    let isMounted = true;
    const apiKey = process.env.NEXT_PUBLIC_GEOAPIFY_API_KEY;
    
    const initMap = async () => {
      try {  
        if (mapRef.current && isMounted && apiKey) {
          // Initialize the map with maplibre
          const map = new maplibregl.Map({
            container: mapRef.current,
            style: `https://maps.geoapify.com/v1/styles/osm-bright/style.json?apiKey=${apiKey}`,
            center: [center.lng, center.lat], // Note Geoapify uses [lng, lat] format
            zoom: zoom
          });
          
          // Add controls
          map.addControl(new maplibregl.NavigationControl());
          
          // Add click handler if provided
          if (onClick) {
            map.on('click', (e: any) => {
              onClick({
                lat: e.lngLat.lat,
                lng: e.lngLat.lng
              });
            });
          }
          
          setMapInstance(map);
        }
      } catch (error) {
        console.error('Error initializing Geoapify map:', error);
      }
    };
    
    initMap();
    
    return () => {
      isMounted = false;
      if (mapInstance) {
        mapInstance.remove();
      }
    };
  }, [center.lat, center.lng, zoom, onClick]);
  
  // Update center and zoom when props change
  useEffect(() => {
    if (!isBrowser || !mapInstance) return;
    
    mapInstance.setCenter([center.lng, center.lat]);
    mapInstance.setZoom(zoom);
  }, [center.lat, center.lng, zoom, mapInstance]);
  
  // Update markers when they change
  useEffect(() => {
    if (!isBrowser || !mapInstance) return;
    
    // Clear existing markers
    mapMarkers.forEach(marker => marker.remove());
    
    // Create new markers
    const newMarkers = markers.map(markerData => {
      // Create a marker element
      const markerEl = document.createElement('div');
      markerEl.className = 'panda-marker';
      markerEl.style.width = '30px';
      markerEl.style.height = '30px';
      markerEl.style.backgroundImage = markerData.icon 
        ? `url(${markerData.icon})` 
        : 'url(/images/po/activities/map-pin.png)';
      markerEl.style.backgroundSize = 'contain';
      markerEl.style.backgroundRepeat = 'no-repeat';
      markerEl.style.cursor = 'pointer';
      
      if (markerData.title) {
        markerEl.title = markerData.title;
      }
      
      // Add the marker to the map
      const marker = new maplibregl.Marker(markerEl)
        .setLngLat([markerData.position.lng, markerData.position.lat])
        .addTo(mapInstance);
      
      return {
        element: markerEl,
        remove: () => marker.remove()
      };
    });
    
    setMapMarkers(newMarkers);
    
    return () => {
      newMarkers.forEach(marker => marker.remove());
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
