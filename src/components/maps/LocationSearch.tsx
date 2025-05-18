// components/maps/LocationSearch.tsx
'use client';

import React, { useState, useEffect, useRef } from 'react';

// Simple location type icons (no external dependencies)
const LocationIcons = {
  country: () => <span className="text-blue-500 text-lg">🌎</span>,
  city: () => <span className="text-green-600 text-lg">🏙️</span>,
  street: () => <span className="text-purple-600 text-lg">🛣️</span>,
  building: () => <span className="text-amber-600 text-lg">🏢</span>,
  location: () => <span className="text-orange-500 text-lg">📍</span>,
};

type Props = {
  onSelect: (place: any) => void;
  placeholder?: string;
  focusOnLoad?: boolean;
  id?: string;
};

// Define types for better TypeScript support
type LocationSuggestion = {
  description: string;
  mainText: string;
  placeId: string;
  secondaryText?: string;
  location: {
    lat: number;
    lng: number;
  };
  locationType: 'country' | 'city' | 'street' | 'building' | 'location';
  icon: React.ReactNode;
  details?: any;
};

export function LocationSearch({ 
  onSelect, 
  placeholder = "Search for a destination", 
  focusOnLoad = false,
  id
}: Props) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Focus input on load if needed
  useEffect(() => {
    if (focusOnLoad && inputRef.current) {
      inputRef.current.focus();
    }
  }, [focusOnLoad]);

  useEffect(() => {
    if (!query || query.length < 2) {
      setSuggestions([]);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setLoading(true);
      setError(null);
      
      try {
        const apiKey = process.env.NEXT_PUBLIC_GEOAPIFY_API_KEY || '5a047258d51943729c19139c17b7ff1a';
        console.log(`ℹ️ Using Geoapify API key (last 4 chars): ...${apiKey.slice(-4)}`);
        
        const apiUrl = new URL('https://api.geoapify.com/v1/geocode/autocomplete');
        apiUrl.searchParams.append('text', query);
        apiUrl.searchParams.append('apiKey', apiKey);
        apiUrl.searchParams.append('limit', '10');
        apiUrl.searchParams.append('format', 'json');
        
        console.log(`Geocoding API URL being called: ${apiUrl.toString().replace(apiKey, '****')}`);
        
        const response = await fetch(apiUrl);
        
        if (!response.ok) {
          const errorData = await response.json();
          console.error("❌ Geoapify Geocoding API error:", response.status, errorData);
          
          // Use fallback data if API call fails
          if (response.status === 401) {
            useFallbackSuggestions(query);
            return;
          }
          
          setError(`API Error: ${errorData.message || 'Unknown error'}`);
          setSuggestions([]);
          return;
        }
        
        const data = await response.json();
        console.log("Geoapify response:", data);
        
        if (data && data.results) {
          // Transform the Geoapify response
          const formattedSuggestions = data.results.map((feature: any) => {
            // Determine the type of result for better categorization
            let locationType: 'country' | 'city' | 'street' | 'building' | 'location' = 'location';
            
            if (feature.result_type === 'country') {
              locationType = 'country';
            } else if (feature.result_type === 'city' || feature.result_type === 'suburb') {
              locationType = 'city';
            } else if (feature.result_type === 'street') {
              locationType = 'street';
            } else if (feature.result_type === 'building') {
              locationType = 'building';
            }
            
            // Create a detailed, hierarchical location description
            let mainText = feature.name || feature.formatted?.split(',')[0];
            
            // Build secondary text
            let details = [];
            if (feature.city && mainText !== feature.city) details.push(feature.city);
            if (feature.state) details.push(feature.state);
            if (feature.country) details.push(feature.country);
            
            let secondaryText = details.length > 0 ? details.join(', ') : '';
            
            return {
              description: feature.formatted,
              mainText: mainText,
              placeId: feature.place_id,
              secondaryText: secondaryText,
              location: {
                lat: feature.lat,
                lng: feature.lon
              },
              locationType,
              icon: LocationIcons[locationType](),
              details: feature
            };
          });
          
          // Sort results with countries and cities first
          formattedSuggestions.sort((a: LocationSuggestion, b: LocationSuggestion) => {
            // First by location type
            const typeOrder = { country: 0, city: 1, street: 2, building: 3, location: 4 };
            const typeA = typeOrder[a.locationType] || 5;
            const typeB = typeOrder[b.locationType] || 5;
            return typeA - typeB;
          });
          
          setSuggestions(formattedSuggestions);
        } else {
          setSuggestions([]);
        }
      } catch (err) {
        console.error("❌ Geoapify Geocoding API error:", err);
        setError("Failed to fetch location suggestions");
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query]);

  // Fallback function for when API calls fail
  const useFallbackSuggestions = (searchQuery: string) => {
    const searchLower = searchQuery.toLowerCase();
    
    // Popular destinations as fallback
    const fallbackData: LocationSuggestion[] = [
      {
        mainText: "Kuala Lumpur",
        secondaryText: "Federal Territory, Malaysia",
        description: "Kuala Lumpur, Federal Territory, Malaysia",
        placeId: "kl-fallback-1",
        location: { lat: 3.139003, lng: 101.686855 },
        locationType: 'city',
        icon: LocationIcons.city()
      },
      {
        mainText: "Malaysia",
        secondaryText: "Southeast Asia",
        description: "Malaysia, Southeast Asia",
        placeId: "malaysia-fallback-1",
        location: { lat: 4.2105, lng: 101.9758 },
        locationType: 'country',
        icon: LocationIcons.country()
      },
      {
        mainText: "Penang",
        secondaryText: "Malaysia",
        description: "Penang, Malaysia",
        placeId: "penang-fallback-1",
        location: { lat: 5.4164, lng: 100.3327 },
        locationType: 'city',
        icon: LocationIcons.city()
      },
      {
        mainText: "Singapore",
        secondaryText: "Southeast Asia",
        description: "Singapore, Southeast Asia",
        placeId: "singapore-fallback-1",
        location: { lat: 1.3521, lng: 103.8198 },
        locationType: 'country',
        icon: LocationIcons.country()
      },
      {
        mainText: "Bangkok",
        secondaryText: "Thailand",
        description: "Bangkok, Thailand",
        placeId: "bangkok-fallback-1",
        location: { lat: 13.7563, lng: 100.5018 },
        locationType: 'city',
        icon: LocationIcons.city()
      }
    ];
    
    // Filter based on search query
    const filteredResults = fallbackData.filter(item => 
      item.description.toLowerCase().includes(searchLower) || 
      item.mainText.toLowerCase().includes(searchLower)
    );
    
    setSuggestions(filteredResults);
    if (filteredResults.length === 0) {
      setError("No results found. Try a different search term.");
    }
  };

  return (
    <div className="relative w-full">
      <input
        ref={inputRef}
        id={id}
        type="text"
        value={query}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQuery(e.target.value)}
        placeholder={placeholder}
        className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
      />
      
      {loading && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          <div className="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}
      
      {error && (
        <div className="mt-1 text-sm text-red-600">
          {error}
        </div>
      )}
      
      {suggestions.length > 0 && (
        <ul className="absolute z-10 w-full bg-white border rounded-md mt-1 max-h-60 overflow-auto shadow-lg">
          {suggestions.map((suggestion) => (
            <li
              key={suggestion.placeId}
              className="p-3 hover:bg-gray-100 cursor-pointer border-b last:border-b-0"
              onClick={() => {
                console.log("Selected suggestion:", suggestion);
                setQuery(suggestion.description);
                onSelect(suggestion);
                setSuggestions([]);
              }}
            >
              <div className="flex items-center gap-2">
                {suggestion.icon}
                <div>
                  <div className="font-medium">{suggestion.mainText}</div>
                  {suggestion.secondaryText && (
                    <div className="text-sm text-gray-600">{suggestion.secondaryText}</div>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}