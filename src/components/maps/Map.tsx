'use client';

import React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';

interface MapProps {
  lat: number;
  lng: number;
  zoom?: number;
  locationName: string;
}

const Map: React.FC<MapProps> = ({ lat, lng, zoom = 15, locationName }) => {
  const geoapifyApiKey = process.env.NEXT_PUBLIC_GEOAPIFY_API_KEY;

  if (!geoapifyApiKey) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-100">
        <p className="text-red-500">Geoapify API key is not configured.</p>
      </div>
    );
  }

  return (
    <MapContainer center={[lat, lng]} zoom={zoom} scrollWheelZoom={true} style={{ height: '100%', width: '100%' }}>
      <TileLayer
        url={`https://maps.geoapify.com/v1/tile/osm-bright/{z}/{x}/{y}.png?apiKey=${geoapifyApiKey}`}
        attribution='Powered by <a href="https://www.geoapify.com/" target="_blank">Geoapify</a> | © <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors'
      />
      <Marker position={[lat, lng]}>
        <Popup>
          {locationName}
        </Popup>
      </Marker>
    </MapContainer>
  );
};

export default Map;
