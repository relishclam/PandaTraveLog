// components/maps/LocationSearch.tsx
'use client';

import React, { useState, useEffect, useRef } from 'react';
// Add the icon imports
import { FaMapMarkerAlt, FaCity, FaGlobe, FaBuilding, FaRoad } from 'react-icons/fa';

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
        const apiKey = process.env.NEXT_PUBLIC_GEOAPIFY_API_KEY || '';
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
        
        // Transform the Geoapify response
        const formattedSuggestions = data.features?.map((feature: any) => {
          const props = feature.properties;
          
          // Determine the type of result for better categorization
          let locationType: 'country' | 'city' | 'street' | 'building' | 'location' = 'location';
          let icon = <FaMapMarkerAlt className="text-orange-500" />;
          
          if (props.result_type === 'country') {
            locationType = 'country';
            icon = <FaGlobe className="text-blue-500" />;
          } else if (props.result_type === 'city') {
            locationType = 'city';
            icon = <FaCity className="text-green-600" />;
          } else if (props.result_type === 'street') {
            locationType = 'street';
            icon = <FaRoad className="text-purple-600" />;
          } else if (props.result_type === 'building') {
            locationType = 'building';
            icon = <FaBuilding className="text-amber-600" />;
          }
          
          // Create a detailed, hierarchical location description
          let mainText = '';
          let secondaryText = '';
          
          if (props.name) {
            mainText = props.name;
          } else if (props.city) {
            mainText = props.city;
          } else if (props.county) {
            mainText = props.county;
          } else if (props.state) {
            mainText = props.state;
          } else if (props.country) {
            mainText = props.country;
          } else {
            mainText = props.formatted?.split(',')[0] || 'Unknown location';
          }
          
          // Build detailed secondary text
          const details = [];
          if (props.city && props.city !== mainText) details.push(props.city);
          if (props.state && props.state !== mainText) details.push(props.state);
          if (props.country) details.push(props.country);
          
          secondaryText = details.join(', ');
          
          return {
            description: props.formatted,
            mainText: mainText,
            placeId: props.place_id,
            secondaryText: secondaryText,
            location: {
              lat: props.lat,
              lng: props.lon
            },
            locationType,
            icon,
            details: props
          };
        }) || [];
        
        // Sort results with countries and cities first
        formattedSuggestions.sort((a: LocationSuggestion, b: LocationSuggestion) => {
          // First by location type
          const typeOrder = { country: 0, city: 1, street: 2, building: 3, location: 4 };
          return (typeOrder[a.locationType] || 5) - 
                 (typeOrder[b.locationType] || 5);
        });
        
        setSuggestions(formattedSuggestions);
      } catch (err) {
        console.error("❌ Geoapify Geocoding API error:", err);
        setError("Failed to fetch location suggestions");
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
        icon: <FaCity className="text-green-600" />
      },
      {
        mainText: "Malaysia",
        secondaryText: "Southeast Asia",
        description: "Malaysia, Southeast Asia",
        placeId: "malaysia-fallback-1",
        location: { lat: 4.2105, lng: 101.9758 },
        locationType: 'country',
        icon: <FaGlobe className="text-blue-500" />
      },
      {
        mainText: "Penang",
        secondaryText: "Malaysia",
        description: "Penang, Malaysia",
        placeId: "penang-fallback-1",
        location: { lat: 5.4164, lng: 100.3327 },
        locationType: 'city',
        icon: <FaCity className="text-green-600" />
      },
      {
        mainText: "Singapore",
        secondaryText: "Southeast Asia",
        description: "Singapore, Southeast Asia",
        placeId: "singapore-fallback-1",
        location: { lat: 1.3521, lng: 103.8198 },
        locationType: 'country',
        icon: <FaGlobe className="text-blue-500" />
      },
      {
        mainText: "Bangkok",
        secondaryText: "Thailand",
        description: "Bangkok, Thailand",
        placeId: "bangkok-fallback-1",
        location: { lat: 13.7563, lng: 100.5018 },
        locationType: 'city',
        icon: <FaCity className="text-green-600" />
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
        className="w-full p-2 border rounded-md focus:ring-2 focus:border-blue-500 focus:outline-none"
      />
      
      {loading && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
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
