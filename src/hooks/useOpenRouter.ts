import { useState, useCallback } from 'react';

export interface EmergencyContact {
  name: string;
  phone: string;
  type: string;
  address?: string;
  notes?: string;
}

export interface Location {
  id: string;
  lat: number;
  lng: number;
  name: string;
  address?: string;
}

export interface MapContext {
  destination: string;
  locations: Location[];
  center: [number, number];
}

export interface UseOpenRouterResult {
  generateText: (prompt: string) => Promise<string>;
  extractEmergencyContacts: (context: any) => Promise<EmergencyContact[]>;
  isLoading: boolean;
  error: string | null;
  geocodeDestination: (destination: string) => Promise<[number, number]>;

  handleMapClick: (lat: number, lng: number, placeName?: string) => void;
  selectedLocations: Location[];
  mapCenter: [number, number];
  setMapCenter: (center: [number, number]) => void;
}

export function useOpenRouter(): UseOpenRouterResult {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedLocations, setSelectedLocations] = useState<Location[]>([]);
  const [mapCenter, setMapCenter] = useState<[number, number]>(
    [40.7128, -74.0060]
  );

  const generateText = useCallback(
    async (prompt: string): Promise<string> => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/ai/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt }),
        });

        if (!response.ok) throw new Error('Failed to generate text');
        const data = await response.json();
        return data.text;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to generate text';
        setError(errorMessage);
        throw new Error(errorMessage);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const extractEmergencyContacts = useCallback(
    async (context: any): Promise<EmergencyContact[]> => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/ai/extract-contacts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(context),
        });

        if (!response.ok) throw new Error('Failed to extract contacts');
        const data = await response.json();
        return data.contacts;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to extract contacts';
        setError(errorMessage);
        throw new Error(errorMessage);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const geocodeDestination = useCallback(
    async (destination: string): Promise<[number, number]> => {
      try {
        const API_KEY = process.env.NEXT_PUBLIC_GEOAPIFY_API_KEY;
        const response = await fetch(
          `https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(
            destination
          )}&apiKey=${API_KEY}`
        );
        const data = await response.json();

        if (data.features?.[0]?.geometry.coordinates) {
          const [lng, lat] = data.features[0].geometry.coordinates;
          return [lat, lng];
        }
        throw new Error('Location not found');
      } catch (err) {
        console.error('Geocoding error:', err);
        return [40.7128, -74.0060]; // Default to NYC
      }
    },
    []
  );

  const handleMapClick = useCallback(
    (lat: number, lng: number, placeName?: string) => {
      const newLocation: Location = {
        id: Date.now().toString(),
        lat,
        lng,
        name: placeName || `Location ${selectedLocations.length + 1}`,
        address: `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
      };
      setSelectedLocations((prev) => [...prev, newLocation]);
    },
    [selectedLocations.length]
  );

  return {
    generateText,
    extractEmergencyContacts,
    isLoading,
    error,
    geocodeDestination,
    handleMapClick,
    selectedLocations,
    mapCenter,
    setMapCenter,
  };
}
