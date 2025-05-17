'use client';

import React, { useState, useEffect, useRef } from 'react';
import { getPlaceSuggestions, getNearbyCitiesAndPOIs, type PlaceSuggestion } from '@/lib/places-service';
import { getCountryCodeByName } from '@/lib/country-codes';
import { PandaAssistant } from '@/components/ui/PandaAssistant';

type LocationSearchProps = {
  onSelect: (place: PlaceSuggestion) => void;
  placeholder?: string;
}

export const LocationSearch: React.FC<LocationSearchProps> = ({
  onSelect,
  placeholder = 'Search for a destination'
}) => {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAssistant, setShowAssistant] = useState(false);
  const [assistantMessage, setAssistantMessage] = useState('');
  
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);
  
  // Clear timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeout.current) {
        clearTimeout(searchTimeout.current);
      }
    };
  }, []);

  // Handle input change with debounce
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }
    
    if (value.length < 2) {
      setSuggestions([]);
      return;
    }
    
    searchTimeout.current = setTimeout(async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Show PO assistant when user starts searching
        if (value.length > 2 && !showAssistant) {
          setAssistantMessage("I'll help you find great places to visit!");
          setShowAssistant(true);
        }
        
        // Detect if input is a country
        const countryCode = getCountryCodeByName(value.trim());
        let results: PlaceSuggestion[] = [];
        if (countryCode) {
          // Restrict to cities within the country
          results = await getPlaceSuggestions(value, {
            country: countryCode,
            restrictToCities: true,
          });
        } else {
          // Always restrict to cities (worldwide)
          results = await getPlaceSuggestions(value, {
            restrictToCities: true,
          });
        }
        // If the top suggestion is a city, fetch nearby cities/POIs
        if (
          results.length > 0 &&
          results[0].types &&
          (results[0].types.includes('locality') || results[0].types.includes('administrative_area_level_3'))
        ) {
          const nearby = await getNearbyCitiesAndPOIs(results[0], 100);
          // Merge city and nearby POIs/cities, removing duplicates by placeId
          const allResults = [results[0], ...nearby.filter(poi => poi.placeId !== results[0].placeId)];
          setSuggestions(allResults);
        } else {
          setSuggestions(results);
        }
      } catch (error) {
        console.error('Error searching for places:', error);
        setError('Failed to search for locations');
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 300);
  };
  
  // Handle suggestion selection
  const handleSelect = (suggestion: PlaceSuggestion) => {
    setQuery(suggestion.description);
    setSuggestions([]);
    onSelect(suggestion);
    
    // Update PO message
    setAssistantMessage(`Great choice! ${suggestion.mainText} is a wonderful destination!`);
    setShowAssistant(true);
  };
  
  return (
    <div className="relative w-full">
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          placeholder={placeholder}
          className="w-full p-3 pr-10 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-backpack-orange focus:border-backpack-orange"
        />
        {loading && (
          <div className="absolute top-1/2 right-3 -translate-y-1/2">
            <div className="w-5 h-5 border-2 border-gray-300 border-t-backpack-orange rounded-full animate-spin"></div>
          </div>
        )}
      </div>
      
      {error && (
        <div className="mt-1 text-sm text-red-600">{error}</div>
      )}
      
      {suggestions.length > 0 && (
        <ul className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
          {suggestions.map((suggestion) => (
            <li
              key={suggestion.placeId}
              onClick={() => handleSelect(suggestion)}
              className="px-4 py-3 hover:bg-bamboo-light cursor-pointer"
            >
              <div className="font-medium">{suggestion.mainText}</div>
              <div className="text-sm text-gray-500">{suggestion.secondaryText}</div>
            </li>
          ))}
        </ul>
      )}
      
      {showAssistant && (
        <PandaAssistant
          message={assistantMessage}
          emotion="excited"
          showMessage={showAssistant}
          onMessageClose={() => setShowAssistant(false)}
          position="bottom-right"
          size="sm"
        />
      )}
    </div>
  );
};
