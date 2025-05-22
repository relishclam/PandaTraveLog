'use client';

import React, { useState, useEffect, useCallback, useRef, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import FocusTrap from 'focus-trap-react'; // You may need to install this package

// Define proper types for Framer Motion components
type MotionDivProps = React.ComponentProps<'div'> & {
  initial?: any;
  animate?: any;
  exit?: any;
  transition?: any;
  whileHover?: any;
  whileTap?: any;
  variants?: any;
  layoutId?: string;
  onLayoutAnimationStart?: () => void;
  onLayoutAnimationComplete?: () => void;
};

const MotionDiv = motion.div as React.FC<MotionDivProps>;

// Define proper types for better TypeScript support
type Destination = {
  place_id: string;
  name: string;
  formattedName: string;
  country: string;
  coordinates: [number, number];
};

// Type for standard GeoJSON-like features (used by fetchCitiesInCountry, fetchPOIsInBBox, etc.)
type GeoapifyFeature = {
  properties: {
    place_id: string;
    country?: string;
    country_code?: string;
    city?: string;
    state?: string;
    district?: string;
    name?: string;
    formatted: string;
    result_type?: string;
    category?: string[]; 
    address_line1?: string;
    address_line2?: string;
  };
  geometry: {
    coordinates: [number, number]; // Typically [lon, lat]
  };
  bbox?: number[];
};

// Type for Geoapify Autocomplete API results (flatter structure)
type GeoapifyAutocompleteResult = {
  place_id: string;
  country?: string;
  country_code?: string;
  city?: string;
  state?: string;
  district?: string;
  name?: string; 
  formatted: string; 
  result_type?: string;
  lon: number;
  lat: number;
  category?: string[];
  bbox?: number[];
  address_line1?: string;
  address_line2?: string;
};

type SuggestionItem = {
  isHeader?: boolean;
  text?: string;
  name?: string;
  formattedName?: string;
  type?: string;
  full?: GeoapifyAutocompleteResult; // CRITICAL: Ensure this uses AutocompleteResult
};

interface DestinationSearchModalProps {
  isOpen: boolean;
  doHandleClose: () => void;
  onSelect: (destination: Destination | Destination[]) => void;
  multiSelect?: boolean;
  existingSelections?: Destination[];
  onStatusChange?: (status: { 
    emotion: 'happy' | 'thinking' | 'excited' | 'sad'; 
    message: string; 
  }) => void; 
}

interface SuggestionItemComponentProps {
  item: SuggestionItem;
  onSelectItem: (item: SuggestionItem) => void; 
  isFocused: boolean;
  isSelected: boolean;
  multiSelect?: boolean; 
  id: string; 
}

// Utility function to get icons (moved outside)
const getIcon = (type?: string) => {
  switch (type) {
    case 'country': return '🌍'; // Globe for countries
    case 'city': return '🏙️'; // Cityscape for cities
    case 'state': return '🏞️'; // National park for states/regions
    case 'administrative': return '🏛️'; // Classical building for administrative areas
    case 'tourism': return '🏖️'; // Beach for tourism
    case 'natural': return '🌲'; // Tree for natural features
    case 'airport': return '✈️'; // Airplane for airports
    default: return '📍'; // Default pin
  }
};

// Function to get popular destinations (moved outside)
const getPopularDestinations = (): SuggestionItem[] => [
  { isHeader: true, text: 'Popular Destinations' },
  { name: 'Paris', formattedName: 'Paris, France', type: 'city', full: { place_id: 'paris', name: 'Paris', formatted: 'Paris, France', country: 'France', lon: 2.3522, lat: 48.8566, result_type: 'city' } as GeoapifyAutocompleteResult },
  { name: 'Tokyo', formattedName: 'Tokyo, Japan', type: 'city', full: { place_id: 'tokyo', name: 'Tokyo', formatted: 'Tokyo, Japan', country: 'Japan', lon: 139.6917, lat: 35.6895, result_type: 'city' } as GeoapifyAutocompleteResult },
  { name: 'Rome', formattedName: 'Rome, Italy', type: 'city', full: { place_id: 'rome', name: 'Rome', formatted: 'Rome, Italy', country: 'Italy', lon: 12.4964, lat: 41.9028, result_type: 'city' } as GeoapifyAutocompleteResult },
  { name: 'New York', formattedName: 'New York, USA', type: 'city', full: { place_id: 'newyork', name: 'New York', formatted: 'New York, USA', country: 'USA', lon: -74.0060, lat: 40.7128, result_type: 'city' } as GeoapifyAutocompleteResult },
];

// Suggestion Item Component (Memoized and moved outside)
const SuggestionItemComponent: React.FC<SuggestionItemComponentProps> = memo(({
  item,
  onSelectItem, 
  isFocused,
  isSelected,
  multiSelect,
  id
}) => {
  if (item.isHeader) {
    return (
      <div 
        className="px-4 py-2 text-sm font-semibold text-gray-500 bg-gray-50 rounded-md"
        role="separator"
        id={id}
      >
        {item.text}
      </div>
    );
  }
  
  return (
    <div
      className={`p-3 bg-white rounded-lg border ${isFocused ? 'ring-2 ring-offset-1 ring-blue-500' : ''} ${isSelected ? 'border-green-500 bg-bamboo-light ring-2 ring-green-500' : 'border-gray-200'} hover:bg-bamboo-light hover:border-green-500 cursor-pointer transition-colors`}
      onClick={() => onSelectItem(item)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelectItem(item);
        }
      }}
      role="option"
      aria-selected={isSelected}
      tabIndex={0} // Make it focusable
      id={id}
    >
      <motion.div // Using framer-motion.div alias
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, ease: "easeOut" }} // Apply transition to motion.div
      >
        <div className="flex items-center">
          <div 
            className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-lg mr-3"
            aria-hidden="true"
          >
            {getIcon(item.type)}
          </div>
          <div className="flex-grow min-w-0">
            <p className={`font-semibold text-gray-800 ${isFocused ? 'text-blue-600' : ''}`}>{item.name}</p>
            {item.formattedName && item.formattedName !== item.name && (
              <p className={`text-sm text-gray-500 ${isFocused ? 'text-blue-500' : ''}`}>{item.formattedName}</p>
            )}
          </div>
          {multiSelect && !isSelected && item.full && item.type !== 'country' && (
            <button 
              onClick={(e) => { 
                e.stopPropagation(); 
                onSelectItem(item); 
              }}
              className="ml-2 px-3 py-1 text-xs font-medium text-white bg-green-500 rounded-full hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50 transition-colors duration-150"
              aria-label={`Add ${item.name} to selections`}
            >
              Add
            </button>
          )}
          {isSelected && multiSelect && (
            <span className="ml-2 text-green-600 font-semibold" aria-label="Selected">
              ✓ Added
            </span>
          )}
        </div>
      </motion.div>
    </div>
  );
});
SuggestionItemComponent.displayName = 'SuggestionItemComponent';

const DestinationSearchModal: React.FC<DestinationSearchModalProps> = ({
  isOpen,
  doHandleClose,
  onSelect, 
  multiSelect = false,
  existingSelections = [],
  onStatusChange // Renamed from handlePandaStatusUpdate
}) => {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([]);
  const [selectedCountry, setSelectedCountry] = useState<GeoapifyAutocompleteResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedDestinations, setSelectedDestinations] = useState<Destination[]>(existingSelections || []); // Updated initialization
  const [focusedIndex, setFocusedIndex] = useState<number>(-1); 
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Helper data and functions for country code biasing
  const countryNameToCodeMap: { [key: string]: string } = {
    "malaysia": "my",
    "thailand": "th",
    "singapore": "sg",
    "japan": "jp",
    "united states": "us",
    "usa": "us",
    "united kingdom": "gb",
    "uk": "gb",
    "france": "fr",
    "germany": "de",
    "canada": "ca",
    "australia": "au",
    "china": "cn",
    "india": "in",
    "brazil": "br",
    "south africa": "za",
    // User can expand this map
  };

  function getCountryCode(countryName: string): string | null {
    return countryNameToCodeMap[countryName.toLowerCase()] || null;
  }

  // Helper to get non-header items, memoized if suggestions don't change often
  // This is used for aria-activedescendant and potentially for mapping focusedIndex
  const nonHeaderItems = React.useMemo(() => suggestions.filter(s => !s.isHeader), [suggestions]);

  // Organize country results
  const organizeCountryResults = useCallback((geoapifyResults: { results?: GeoapifyAutocompleteResult[] }): SuggestionItem[] => {
    const features = geoapifyResults.results || []; // features are GeoapifyAutocompleteResult
    const processedPlaceIds = new Set<string>();
    
    const countries: SuggestionItem[] = [];
    const majorCities: SuggestionItem[] = [];
    const regions: SuggestionItem[] = [];
    
    features.forEach((feature) => {
      if (!feature.place_id || processedPlaceIds.has(feature.place_id)) {
        return; // Skip if no place_id or already processed
      }
      
      if (feature.country_code && feature.result_type === "country") {
        countries.push({
          name: feature.country,
          formattedName: feature.formatted,
          type: "country",
          full: feature
        });
        processedPlaceIds.add(feature.place_id);
      } else if (feature.city && feature.country) {
        majorCities.push({
          name: feature.city,
          formattedName: `${feature.city}, ${feature.country}`,
          type: "city",
          full: feature
        });
        processedPlaceIds.add(feature.place_id);
      } else if (feature.state && feature.country) {
        regions.push({
          name: feature.state,
          formattedName: `${feature.state}, ${feature.country}`,
          type: "region",
          full: feature
        });
        processedPlaceIds.add(feature.place_id);
      }
    });
    
    return [
      ...(countries.length ? [{ isHeader: true, text: "Countries" }] : []),
      ...countries,
      ...(majorCities.length ? [{ isHeader: true, text: "Popular Cities" }] : []),
      ...majorCities,
      ...(regions.length ? [{ isHeader: true, text: "Regions" }] : []),
      ...regions
    ];
  }, []);

  // Organize destinations within a country
  const organizeDestinationsInCountry = useCallback((geoapifyResults: { results?: GeoapifyAutocompleteResult[] }): SuggestionItem[] => {
    const features = geoapifyResults.results || []; // features are GeoapifyAutocompleteResult
    const processedPlaceIds = new Set<string>();
    
    const cities: SuggestionItem[] = [];
    const attractions: SuggestionItem[] = [];
    const districts: SuggestionItem[] = [];
    
    features.forEach((feature) => {
      if (!feature.place_id || processedPlaceIds.has(feature.place_id)) {
        return; // Skip if no place_id or already processed
      }
      
      if (feature.city) {
        cities.push({
          name: feature.city,
          formattedName: feature.formatted,
          type: "city",
          full: feature
        });
        processedPlaceIds.add(feature.place_id);
      } else if (feature.category && feature.category.includes('tourism')) {
        attractions.push({
          name: feature.name || feature.formatted,
          formattedName: feature.formatted,
          type: "attraction",
          full: feature
        });
        processedPlaceIds.add(feature.place_id);
      } else if (feature.district) {
        districts.push({
          name: feature.district,
          formattedName: feature.formatted,
          type: "district",
          full: feature
        });
        processedPlaceIds.add(feature.place_id);
      }
    });
    
    return [
      ...(cities.length ? [{ isHeader: true, text: "Cities" }] : []),
      ...cities,
      ...(attractions.length ? [{ isHeader: true, text: "Attractions" }] : []),
      ...attractions,
      ...(districts.length ? [{ isHeader: true, text: "Districts" }] : []),
      ...districts
    ];
  }, []);

  // Handle item selection
  const handleItemSelect = useCallback(async (item: SuggestionItem) => {
    if (item.isHeader || !item.full) return;

    if (item.type === 'country' && item.full) {
      setSelectedCountry(item.full);
      setQuery(''); 
      setSuggestions([]); 
      if (onStatusChange) onStatusChange({ emotion: 'thinking', message: `Looking for places in ${item.full.name || item.full.formatted}...` });
      if (inputRef.current) inputRef.current.focus();
    } else if (item.full) { 
      if (onStatusChange) onStatusChange({ emotion: 'excited', message: `Great choice! Adding ${item.full.name || item.full.formatted}.` });
      
      const newDestination: Destination = {
        place_id: item.full.place_id,
        name: item.full.city || item.full.name || item.full.formatted, 
        formattedName: item.full.formatted,
        country: item.full.country || (selectedCountry?.name || ''),
        coordinates: [item.full.lon, item.full.lat]
      };

      if (multiSelect) {
        const isAlreadySelected = selectedDestinations.some(d => d.place_id === newDestination.place_id);
        let updatedSelections;
        if (isAlreadySelected) {
          updatedSelections = selectedDestinations.filter(d => d.place_id !== newDestination.place_id);
        } else {
          updatedSelections = [...selectedDestinations, newDestination];
        }
        setSelectedDestinations(updatedSelections);
        if (onSelect) {
          // For multiSelect, onSelect might expect an array or be called for each item
          // Assuming onSelect is designed to handle single additions/removals or the full list
          (onSelect as (dest: Destination | Destination[]) => void)(newDestination); // Or pass updatedSelections
        }
      } else {
        if (onSelect) {
          onSelect(newDestination);
        }
        doHandleClose(); 
      }
    }
  }, [
    multiSelect, 
    onSelect, 
    doHandleClose, 
    selectedDestinations, 
    setSelectedDestinations, 
    onStatusChange, 
    setSelectedCountry, 
    setQuery, 
    setSuggestions, 
    selectedCountry
  ]); 

  const fetchSuggestions = useCallback(async (currentQuery: string) => {
    const apiKey = process.env.NEXT_PUBLIC_GEOAPIFY_API_KEY;
    if (!apiKey) {
      console.error("Geoapify API key is not set.");
      setSuggestions(getPopularDestinations()); // Fallback to popular destinations
      setError("API key not configured. Displaying popular destinations.");
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);

    let apiUrl = `https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(currentQuery)}&format=json&apiKey=${apiKey}&limit=10&lang=en`;

    const potentialCountryCodeFromQuery = getCountryCode(currentQuery);

    if (selectedCountry && selectedCountry.country_code) {
      // If a country is ALREADY selected from the dropdown, strictly filter by it.
      apiUrl += `&filter=countrycode:${selectedCountry.country_code}`;
    } else if (potentialCountryCodeFromQuery) {
      // If NO country is selected, BUT the search query ITSELF is a country name, strictly filter by it.
      apiUrl += `&filter=countrycode:${potentialCountryCodeFromQuery}`;
    } else {
      // No country selected, and query is not a country name (e.g., city, POI) - perform a global search.
      // No additional country-specific parameters needed here.
    }

    try {
      setError(null);
      if (!currentQuery.trim()) {
        setSuggestions(selectedCountry ? [] : getPopularDestinations());
        if (selectedCountry && onStatusChange) { // Use renamed prop
          onStatusChange({ emotion: 'happy', message: `What are you looking for in ${selectedCountry.name}?` });
        } else if (onStatusChange) { // Use renamed prop
          onStatusChange({ emotion: 'happy', message: 'Where to next? Search for a country, city, or attraction!' });
        }
        return;
      }

      setIsLoading(true);
      if (onStatusChange) onStatusChange({ emotion: 'thinking', message: 'Fetching suggestions...' }); // Use renamed prop

      const response = await fetch(apiUrl);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Search request failed' }));
        throw new Error(errorData.message || `Search failed with status: ${response.status}`);
      }
      const data = await response.json();
      const organizedResults = selectedCountry
        ? organizeDestinationsInCountry(data) 
        : organizeCountryResults(data);
      
      setSuggestions(organizedResults.length > 0 ? organizedResults : [{ isHeader: true, text: 'No results found.' }]);
      if (organizedResults.length === 0 && onStatusChange) { // Use renamed prop
        onStatusChange({ emotion: 'sad', message: `Sorry, I couldn't find anything for "${currentQuery}". Try a different search?` });
      }

    } catch (err: any) {
      console.error("Error fetching suggestions:", err);
      setError(err.message || "Failed to fetch suggestions.");
      setSuggestions(getPopularDestinations()); // Fallback to popular destinations on error
      if (onStatusChange) onStatusChange({ emotion: 'sad', message: `Oops! Something went wrong while searching. ${err.message}` }); // Use renamed prop
    } finally {
      setIsLoading(false);
    }
  }, [selectedCountry, onStatusChange, organizeCountryResults, organizeDestinationsInCountry]); 

  // Reset focused index when suggestions change
  useEffect(() => {
    setFocusedIndex(-1);
  }, [suggestions]);
  
  // Focus input when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 300);
    }
  }, [isOpen]);
  
  // Reset state when closed
  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => {
        setQuery('');
        setSuggestions([]);
        setError(null);
      }, 300);
    }
  }, [isOpen]);
  
  // Handle search input with debouncing
  useEffect(() => {
    if (!query.trim() && !selectedCountry) {
      setSuggestions(getPopularDestinations());
      setError(null);
      return;
    }
    if (onStatusChange) onStatusChange({
      emotion: 'thinking',
      message: `Let me find places like "${query}" for you...`
    });
    
    const debounce = setTimeout(() => fetchSuggestions(query), 500);
    return () => clearTimeout(debounce);
  }, [query, selectedCountry, fetchSuggestions, onStatusChange]); 
  
  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    const currentNonHeaderItems = suggestions.filter(item => !item.isHeader);
    if (currentNonHeaderItems.length === 0 && suggestions.length > 0 && suggestions[0].isHeader && suggestions[0].text === 'No results found.') {
      // If only "No results found" header is present, don't navigate
      if (e.key === 'Escape') doHandleClose();
      return;
    }

    let newFocusedIndex = focusedIndex;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      let nextIndex = focusedIndex + 1;
      while (nextIndex < suggestions.length && suggestions[nextIndex].isHeader) {
        nextIndex++;
      }
      if (nextIndex < suggestions.length) {
        setFocusedIndex(nextIndex);
        // Scroll into view
        if (listRef.current) {
          const itemElement = listRef.current.children[nextIndex] as HTMLElement;
          itemElement?.scrollIntoView({ 
            behavior: 'smooth',
            block: 'nearest'
          });
        }
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      let prevIndex = focusedIndex - 1;
      while (prevIndex >= 0 && suggestions[prevIndex].isHeader) {
        prevIndex--;
      }
      if (prevIndex >= 0) {
        setFocusedIndex(prevIndex);
        // Scroll into view
        if (listRef.current) {
          const itemElement = listRef.current.children[prevIndex] as HTMLElement;
          itemElement?.scrollIntoView({ 
            behavior: 'smooth',
            block: 'nearest'
          });
        }
      }
    } else if (e.key === 'Enter' && focusedIndex >= 0 && focusedIndex < suggestions.length) {
      e.preventDefault();
      const selectedItem = suggestions[focusedIndex];
      if (selectedItem && !selectedItem.isHeader) {
        handleItemSelect(selectedItem);
      }
    } else if (e.key === 'Escape') {
      doHandleClose();
    }
  }, [suggestions, focusedIndex, doHandleClose, handleItemSelect]); 
  
  // Selected destinations display (Memoized)
  const renderSelectedDestinations = useCallback(() => (
    <div className="mx-4 mt-2 mb-4">
      <div className="text-sm font-medium text-gray-500 mb-2" id="selected-destinations">
        Selected Destinations:
      </div>
      <div className="flex flex-wrap gap-2" role="list" aria-labelledby="selected-destinations">
        {selectedDestinations.map((dest) => (
          <div 
            key={dest.place_id || `selected-${dest.name}`} 
            className="flex items-center px-3 py-1 bg-green-100 text-green-800 rounded-full"
            role="listitem"
          >
            <span>{dest.name}</span>
            <button 
              className="ml-1 p-1 hover:bg-green-200 rounded-full transition-colors"
              onClick={() => {
                setSelectedDestinations(prev => prev.filter(d => d.place_id !== dest.place_id)); // Filter by place_id
                // Update global assistant when destination removed
                onStatusChange?.({ 
                  emotion: 'thinking', 
                  message: `Removed ${dest.name}. Anything else you'd like to explore?`
                });
              }}
              aria-label={`Remove ${dest.name}`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </div>
  ), [selectedDestinations]);

  return (
    <AnimatePresence>
      {isOpen && (
        <FocusTrap>
          <div role="dialog" aria-modal="true" aria-labelledby="modal-title">
            <MotionDiv 
              className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={doHandleClose}
            />
            <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
              <MotionDiv 
                className="relative w-full max-w-3xl p-1 bg-white rounded-xl shadow-xl pointer-events-auto"
                initial={{ scale: 0.7, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.7, opacity: 0 }}
                transition={{ 
                  type: "spring", 
                  stiffness: 300, 
                  damping: 30 
                }}
                onClick={(e: React.MouseEvent) => e.stopPropagation()}
              >
                {/* Bamboo-themed header */}
                <div className="flex items-center p-4 bg-bamboo-light rounded-t-xl border-b-2 border-green-500">
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold text-green-800" id="modal-title">Destination Search</h2>
                  </div>
                  <button 
                    onClick={doHandleClose}
                    className="p-2 text-green-800 hover:text-green-600 transition-colors"
                    aria-label="Close destination search"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                
                {/* Selected country pill */}
                {selectedCountry && selectedCountry.country && (
                  <div className="mx-4 mt-4">
                    <MotionDiv 
                      className="flex items-center p-2 bg-backpack-orange/10 rounded-full"
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.1 }}
                    >
                      <div 
                        className="flex items-center justify-center w-8 h-8 bg-backpack-orange text-white rounded-full mr-2"
                        aria-hidden="true"
                      >
                        {selectedCountry.country_code && 
                          String.fromCodePoint(
                            ...selectedCountry.country_code
                              .toUpperCase()
                              .split('')
                              .map(c => 127397 + c.charCodeAt(0))
                          )
                        }
                      </div>
                      <span className="flex-1 font-medium">{selectedCountry.country}</span>
                      <button 
                        className="p-1 hover:bg-backpack-orange/20 rounded-full transition-colors"
                        onClick={() => {
                          setSelectedCountry(null);
                          // Update global assistant when country unselected
                          onStatusChange?.({ 
                            emotion: 'thinking', 
                            message: "Let's search for a different destination!"
                          });
                        }}
                        aria-label={`Unselect ${selectedCountry.country}`}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </MotionDiv>
                  </div>
                )}
                
                {/* Multi-select destinations */}
                {multiSelect && selectedDestinations.length > 0 && renderSelectedDestinations()}
                
                {/* Search input */}
                <div className="p-4">
                  <div className="relative">
                    <label htmlFor="destination-search" className="sr-only">
                      Search destinations
                    </label>
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                    <input
                      id="destination-search"
                      ref={inputRef}
                      type="text"
                      className="block w-full pl-10 pr-4 py-3 border border-gray-300 rounded-full text-lg focus:ring-2 focus:ring-backpack-orange focus:border-transparent transition-all"
                      placeholder={selectedCountry && selectedCountry.country
                        ? `Find places in ${selectedCountry.country}...` 
                        : "Where would you like to go?"}
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      onKeyDown={handleKeyDown}
                      aria-controls="search-results"
                      aria-activedescendant={
                        focusedIndex >= 0 && 
                        suggestions[focusedIndex] && 
                        !suggestions[focusedIndex].isHeader && 
                        suggestions[focusedIndex].full?.place_id 
                          ? `suggestion-item-${suggestions[focusedIndex].full!.place_id}` 
                          : focusedIndex >= 0 && suggestions[focusedIndex] && suggestions[focusedIndex].isHeader
                          ? `suggestion-header-${suggestions[focusedIndex].text}`
                          : undefined
                      }
                      aria-expanded={suggestions.length > 0}
                      role="combobox"
                      aria-autocomplete="list"
                    />
                    {isLoading && (
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                        <div 
                          className="w-5 h-5 border-t-2 border-backpack-orange rounded-full animate-spin"
                          aria-hidden="true"
                        />
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Error message with panda image */}
                {error && (
                  <div className="px-4 py-3 text-red-600 bg-red-100 rounded mx-4 mb-2 flex items-center">
                    <div className="flex-shrink-0 mr-3">
                      <div className="flex items-center justify-center w-10 h-10 bg-red-200 rounded-full text-red-600">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                      </div>
                    </div>
                    <div>
                      <p className="font-medium">Error: {error}</p>
                      <p className="text-sm text-red-500">Please try a different search term or try again later.</p>
                    </div>
                  </div>
                )}
                
                {/* Results */}
                <div 
                  className="mt-4 max-h-[calc(100vh-20rem)] overflow-y-auto pr-2 space-y-2 custom-scrollbar"
                  id="search-results"
                  role="listbox"
                  aria-label="Search results"
                  ref={listRef}
                >
                  {suggestions.length > 0 ? (
                    <div className="space-y-2">
                      {suggestions.map((item, index) => {
                        const itemId = item.isHeader 
                          ? `suggestion-header-${item.text}` 
                          : `suggestion-item-${item.full?.place_id || index}`; // Fallback to index if place_id is missing
                        return (
                          <SuggestionItemComponent
                            key={itemId} // Use consistent key
                            id={itemId} // Pass the generated ID
                            item={item}
                            onSelectItem={handleItemSelect}
                            isFocused={focusedIndex === index} // focusedIndex directly maps to suggestions array index
                            isSelected={item.full ? selectedDestinations.some(dest => dest.place_id === item.full?.place_id) : false}
                            multiSelect={multiSelect}
                          />
                        );
                      })}
                    </div>
                  ) : isLoading ? (
                    <div className="py-12 flex flex-col items-center justify-center">
                      <div className="mb-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                      </div>
                      <p className="text-gray-500 text-center max-w-md">
                        Searching for places...
                      </p>
                    </div>
                  ) : query.length > 1 && !isLoading ? (
                    <div className="py-12 flex flex-col items-center justify-center">
                      <div className="mb-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                      </div>
                      <p className="text-gray-500 text-center max-w-md">
                        No matching places found. Try a different search term.
                      </p>
                    </div>
                  ) : !query.trim() && !selectedCountry ? (
                    <div className="py-6">
                      <p className="text-sm font-medium text-gray-500 mb-3">
                        Popular destinations:
                      </p>
                      <div 
                        className="grid grid-cols-2 sm:grid-cols-3 gap-3"
                        role="list"
                        aria-label="Popular destinations"
                      >
                        {getPopularDestinations().slice(1).map((dest, index) => ( 
                          <div 
                            key={`popular-${index}`}
                            className="flex flex-col items-center cursor-pointer p-2 hover:bg-gray-100 rounded-lg transition-colors duration-150"
                            onClick={() => {
                              if (dest.full) {
                                // Create a temporary SuggestionItem to pass to handleItemSelect
                                const suggestionItem: SuggestionItem = {
                                  name: dest.name,
                                  formattedName: dest.formattedName,
                                  type: dest.type,
                                  full: dest.full,
                                  isHeader: false,
                                };
                                handleItemSelect(suggestionItem);
                              }
                            }}
                          >
                            <div className="w-10 h-10 bg-green-100 text-green-800 rounded-full flex items-center justify-center text-lg font-semibold mb-2">
                              {dest.name ? dest.name.substring(0, 1) : '?'}
                            </div>
                            <span className="text-sm text-center">{dest.formattedName}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
                
                {/* Footer with Done button */} 
                {multiSelect && selectedDestinations.length > 0 && (
                  <div className="mt-6 pt-4 border-t border-gray-200">
                    <button
                      onClick={() => {
                        onSelect(selectedDestinations);
                        doHandleClose();
                      }}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 px-4 rounded-lg shadow-md hover:shadow-lg transition-all duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-opacity-75 flex items-center justify-center space-x-2"
                      aria-label="Confirm selected destinations and close modal"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      <span>Done ({selectedDestinations.length} Selected)</span>
                    </button>
                  </div>
                )}
              </MotionDiv>
            </div>
          </div>
        </FocusTrap>
      )}
    </AnimatePresence>
  );
};

export default DestinationSearchModal;