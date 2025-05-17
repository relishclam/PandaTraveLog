'use client';

import dynamic from 'next/dynamic';
import React from 'react';

// Dynamically import the MapComponent with SSR disabled
const MapComponent = dynamic(
  () => import('./MapComponent'),
  { 
    ssr: false, // This is the key - disables server-side rendering
    loading: () => <MapPlaceholder />
  }
);

// Type definition for the props
interface ClientSideMapProps {
  center: { lat: number; lng: number };
  zoom?: number;
  markers?: Array<{
    position: { lat: number; lng: number };
    title?: string;
    icon?: string;
  }>;
  onClick?: (e: any) => void;
  className?: string;
  style?: React.CSSProperties;
}

// A simple placeholder to show while the map is loading
function MapPlaceholder() {
  return (
    <div 
      className="bg-bamboo-light animate-pulse flex items-center justify-center"
      style={{ width: '100%', height: '100%', minHeight: '200px', borderRadius: '0.375rem' }}
    >
      <div className="text-backpack-orange text-center">
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          className="h-12 w-12 mx-auto mb-2" 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" 
          />
        </svg>
        <p>Loading map...</p>
      </div>
    </div>
  );
}

// Client-side only wrapper for MapComponent
export default function ClientSideMap({ 
  center, 
  zoom, 
  markers, 
  onClick,
  className,
  style
}: ClientSideMapProps) {
  return (
    <div className={className} style={{ ...style, width: '100%', height: '100%', minHeight: '200px', position: 'relative' }}>
      <MapComponent 
        center={center} 
        zoom={zoom} 
        markers={markers} 
        onClick={onClick} 
      />
    </div>
  );
}
