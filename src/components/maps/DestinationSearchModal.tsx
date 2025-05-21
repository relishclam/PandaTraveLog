'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
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
  };
  geometry: {
    coordinates: [number, number];
  };
  bbox?: number[];
};

type SuggestionItem = {
  isHeader?: boolean;
  text?: string;
  name?: string;
  formattedName?: string;
  type?: string;
  full?: GeoapifyFeature;
};

interface DestinationSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (destination: Destination | Destination[]) => void;
  multiSelect?: boolean;
  existingSelections?: Destination[];
  onStatusChange?: (status: { emotion: 'happy' | 'thinking' | 'excited' | 'sad'; message: string }) => void;
}

const DestinationSearchModal: React.FC<DestinationSearchModalProps> = ({ 
  isOpen, 
  onClose, 
  onSelect,
  multiSelect = false,
  existingSelections = [],
  onStatusChange
}) => {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([]);
  const [selectedCountry, setSelectedCountry] = useState<GeoapifyFeature | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  // Emotion and messaging state removed - now handled by global assistant
  const [selectedDestinations, setSelectedDestinations] = useState<Destination[]>(existingSelections || []);
  const [imageError, setImageError] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [error, setError] = useState<string | null>(null);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionRefs = useRef<Array<HTMLDivElement | null>>([]);
  
  // Reset focused index when suggestions change
  useEffect(() => {
    setFocusedIndex(-1);
    // Resize the array to match suggestions length
    suggestionRefs.current = suggestionRefs.current.slice(0, suggestions.length);
    suggestionRefs.current = [...Array(suggestions.length)].map((_, i) => 
      suggestionRefs.current[i] || null
    );
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
    if (!query || query.length < 2) {
      setSuggestions([]);
      return;
    }
    
    // Update global assistant via callback
    onStatusChange?.({ 
      emotion: 'thinking', 
      message: `Let me find places like "${query}" for you...`
    });
    
    const fetchSuggestions = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const apiKey = process.env.NEXT_PUBLIC_GEOAPIFY_API_KEY;
        
        if (!apiKey) {
          console.error("Missing Geoapify API key");
          throw new Error("API key is not configured");
        }
        
        // Build request URL
        const params = new URLSearchParams({
          text: query,
          format: 'json',
          apiKey,
          limit: '10',
        });
        // Only add filter if a country is selected
        if (selectedCountry?.properties?.country_code) {
          params.append('filter', `countrycode:${selectedCountry.properties.country_code}`);
        }
        
        const response = await fetch(
          `https://api.geoapify.com/v1/geocode/autocomplete?${params.toString()}`
        );
        
        if (!response.ok) {
          throw new Error(`Search failed with status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.results && data.results.length > 0) {
          const organizedResults = selectedCountry 
            ? organizeDestinationsInCountry(data)
            : organizeCountryResults(data);
          
          console.log('Search results found:', data.results.length);
          console.log('Organized results:', organizedResults);
          setSuggestions(organizedResults);
          // Update global assistant with results
          onStatusChange?.({ 
            emotion: 'excited', 
            message: `I found ${data.results.length} great places for you!`
          });
        } else {
          setSuggestions([]);
          // Update global assistant with no results
          onStatusChange?.({ 
            emotion: 'sad', 
            message: `I couldn't find any places matching "${query}". Try a different search?`
          });
        }
      } catch (error) {
        console.error("Error fetching suggestions:", error);
        setSuggestions([]);
        setError(error instanceof Error ? error.message : "An unknown error occurred");
        onStatusChange?.({ 
          emotion: 'sad', 
          message: "Oh no! I had trouble searching for places. Let's try again!"
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    const debounce = setTimeout(fetchSuggestions, 500);
    return () => clearTimeout(debounce);
  }, [query, selectedCountry]);
  
  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    // Ignore if there are no suggestions
    if (suggestions.length === 0) return;
    
    const nonHeaderItems = suggestions.filter(item => !item.isHeader);
    
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedIndex(prev => {
        const newIndex = Math.min(prev + 1, nonHeaderItems.length - 1);
        // Find the item index in the original array
        const actualIndex = suggestions.findIndex(item => 
          !item.isHeader && item === nonHeaderItems[newIndex]
        );
        
        // Scroll into view
        if (suggestionRefs.current[actualIndex]) {
          suggestionRefs.current[actualIndex]?.scrollIntoView({ 
            behavior: 'smooth',
            block: 'nearest'
          });
        }
        
        return newIndex;
      });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedIndex(prev => {
        const newIndex = Math.max(prev - 1, 0);
        // Find the item index in the original array
        const actualIndex = suggestions.findIndex(item => 
          !item.isHeader && item === nonHeaderItems[newIndex]
        );
        
        // Scroll into view
        if (suggestionRefs.current[actualIndex]) {
          suggestionRefs.current[actualIndex]?.scrollIntoView({ 
            behavior: 'smooth',
            block: 'nearest'
          });
        }
        
        return newIndex;
      });
    } else if (e.key === 'Enter' && focusedIndex >= 0) {
      e.preventDefault();
      const nonHeaderItems = suggestions.filter(item => !item.isHeader);
      if (focusedIndex < nonHeaderItems.length) {
        handleItemSelect(nonHeaderItems[focusedIndex]);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  }, [suggestions, focusedIndex, onClose]);
  
  // Handle destination addition
  const handleDestinationAdd = useCallback((item: SuggestionItem) => {
    if (!item.full || !item.name) return;
    
    // Add to selected destinations list
    const newDestination: Destination = {
      place_id: item.full.properties.place_id || '',
      name: item.name,
      formattedName: item.formattedName || item.name,
      country: item.full.properties.country || '',
      coordinates: item.full.geometry.coordinates
    };
    
    setSelectedDestinations(prev => [...prev, newDestination]);
    
    // Update global assistant when destination added
    onStatusChange?.({ 
      emotion: 'excited', 
      message: `${item.name} added! Select more destinations or click "Done" when finished.`
    });
    
    // Clear input to encourage more selections
    setQuery('');
    // Reset focus to input for continuous input
    inputRef.current?.focus();
  }, []);
  
  // Handle item selection
  // Enhanced selection handler: triggers secondary queries for countries/cities
const handleItemSelect = useCallback(async (item: SuggestionItem) => {
  if (item.isHeader) return;

  // Helper to fetch cities in a country
  const fetchCitiesInCountry = async (countryCode: string) => {
    const apiKey = process.env.NEXT_PUBLIC_GEOAPIFY_API_KEY;
    if (!apiKey) return [];
    const params = new URLSearchParams({
      type: 'city',
      filter: `countrycode:${countryCode}`,
      format: 'json',
      apiKey,
      limit: '20',
    });
    const response = await fetch(`https://api.geoapify.com/v1/geocode/search?${params.toString()}`);
    if (!response.ok) return [];
    const data = await response.json();
    return data.features || [];
  };

  // Helper to fetch POIs in a bounding box
  const fetchPOIsInBBox = async (bbox: number[]) => {
    const apiKey = process.env.NEXT_PUBLIC_GEOAPIFY_API_KEY;
    if (!apiKey) return [];
    const bboxParam = bbox.join(',');
    const params = new URLSearchParams({
      categories: 'tourism,sights,entertainment',
      filter: `rect:${bboxParam}`,
      limit: '20',
      apiKey,
    });
    const response = await fetch(`https://api.geoapify.com/v2/places?${params.toString()}`);
    if (!response.ok) return [];
    const data = await response.json();
    return data.features || [];
  };

  // Helper to fetch nearby cities by circle
  const fetchNearbyCities = async (lon: number, lat: number, radius: number = 30000) => {
    const apiKey = process.env.NEXT_PUBLIC_GEOAPIFY_API_KEY;
    if (!apiKey) return [];
    const params = new URLSearchParams({
      type: 'city',
      filter: `circle:${lon},${lat},${radius}`,
      format: 'json',
      apiKey,
      limit: '10',
    });
    const response = await fetch(`https://api.geoapify.com/v1/geocode/search?${params.toString()}`);
    if (!response.ok) return [];
    const data = await response.json();
    return data.features || [];
  };

  if (item.type === 'country' && item.full) {
    setSelectedCountry(item.full);
    // Update global assistant when country selected
    onStatusChange?.({ 
      emotion: 'excited', 
      message: `Great choice! Let's explore ${item.name || 'this country'}! Fetching cities and attractions...`
    });
    setQuery('');
    if (inputRef.current) inputRef.current.focus();

    // --- Enhancement: Fetch cities and POIs in country ---
    const countryCode = item.full.properties.country_code;
    const bbox = item.full.bbox || undefined;
    let cities: any[] = [];
    let pois: any[] = [];
    if (countryCode) {
      cities = await fetchCitiesInCountry(countryCode);
    }
    if (bbox) {
      pois = await fetchPOIsInBBox(bbox);
    }
    // Optionally, update suggestions or UI with these results
    // setSuggestions([...]);
    // setPoMessage(...);
  } else if (item.type === 'city' && item.full) {
    // Update global assistant when city selected
    onStatusChange?.({ 
      emotion: 'excited', 
      message: `Exploring ${item.name}! Fetching places of interest and nearby cities...`
    });
    setQuery('');
    if (inputRef.current) inputRef.current.focus();

    // --- Enhancement: Fetch POIs in city and nearby cities ---
    const coords = item.full.geometry.coordinates;
    const bbox = item.full.bbox || undefined;
    let pois: any[] = [];
    let nearbyCities: any[] = [];
    if (bbox) {
      pois = await fetchPOIsInBBox(bbox);
    }
    if (coords) {
      nearbyCities = await fetchNearbyCities(coords[0], coords[1]);
    }
    // Optionally, update suggestions or UI with these results
    // setSuggestions([...]);
    // setPoMessage(...);
  } else if (multiSelect) {
    handleDestinationAdd(item);
  } else if (item.full && item.name) {
    // Close the modal and pass the selection to parent
    // Update global assistant instead via onStatusChange
    onSelect({
      place_id: item.full.properties.place_id || '',
      name: item.name,
      formattedName: item.formattedName || item.name,
      country: item.full.properties.country || '',
      coordinates: item.full.geometry.coordinates
    });
    onClose();
  }
}, [multiSelect, onSelect, onClose, handleDestinationAdd]);
  
  // Organize country results
  const organizeCountryResults = useCallback((geoapifyResults: { features?: GeoapifyFeature[] }): SuggestionItem[] => {
    const features = geoapifyResults.features || [];
    
    const countries: SuggestionItem[] = [];
    const majorCities: SuggestionItem[] = [];
    const regions: SuggestionItem[] = [];
    
    features.forEach((feature) => {
      const properties = feature.properties;
      
      if (properties.country_code && properties.result_type === "country") {
        countries.push({
          name: properties.country,
          formattedName: properties.formatted,
          type: "country",
          full: feature
        });
      } 
      else if (properties.city && properties.country) {
        majorCities.push({
          name: properties.city,
          formattedName: `${properties.city}, ${properties.country}`,
          type: "city",
          full: feature
        });
      }
      else if (properties.state && properties.country) {
        regions.push({
          name: properties.state,
          formattedName: `${properties.state}, ${properties.country}`,
          type: "region",
          full: feature
        });
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
  const organizeDestinationsInCountry = useCallback((geoapifyResults: { features?: GeoapifyFeature[] }): SuggestionItem[] => {
    const features = geoapifyResults.features || [];
    
    const cities: SuggestionItem[] = [];
    const attractions: SuggestionItem[] = [];
    const districts: SuggestionItem[] = [];
    
    features.forEach((feature) => {
      const properties = feature.properties;
      
      if (properties.city) {
        cities.push({
          name: properties.city,
          formattedName: properties.formatted,
          type: "city",
          full: feature
        });
      } 
      else if (properties.category && properties.category.includes('tourism')) {
        attractions.push({
          name: properties.name || properties.formatted,
          formattedName: properties.formatted,
          type: "attraction",
          full: feature
        });
      }
      else if (properties.district) {
        districts.push({
          name: properties.district,
          formattedName: properties.formatted,
          type: "district",
          full: feature
        });
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
  
  // Memoize expensive operations
  const nonHeaderItems = useMemo(() => 
    suggestions.filter(item => !item.isHeader), 
  [suggestions]);
  
  // Get icon for result type
  const getIcon = useCallback((type?: string) => {
    switch(type) {
      case 'country': return '🌍';
      case 'city': return '🏙️';
      case 'region': return '🗺️';
      case 'attraction': return '🏛️';
      case 'district': return '🏘️';
      default: return '📍';
    }
  }, []);

  // Render selected destinations
  const renderSelectedDestinations = useCallback(() => (
    <div className="mx-4 mt-2 mb-4">
      <div className="text-sm font-medium text-gray-500 mb-2" id="selected-destinations">
        Selected Destinations:
      </div>
      <div className="flex flex-wrap gap-2" role="list" aria-labelledby="selected-destinations">
        {selectedDestinations.map((dest, index) => (
          <div 
            key={`selected-${index}`} 
            className="flex items-center px-3 py-1 bg-green-100 text-green-800 rounded-full"
            role="listitem"
          >
            <span>{dest.name}</span>
            <button 
              className="ml-1 p-1 hover:bg-green-200 rounded-full transition-colors"
              onClick={() => {
                setSelectedDestinations(prev => prev.filter((_, i) => i !== index));
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

  // Create suggestion item component to improve performance with React.memo
  const SuggestionItem = React.memo(({ 
    item, 
    index, 
    isFocused,
    onSelect 
  }: { 
    item: SuggestionItem; 
    index: number;
    isFocused: boolean;
    onSelect: (item: SuggestionItem) => void;
  }) => {
    // Debug to verify item props
    console.log('Rendering suggestion item:', item);
    if (item.isHeader) {
      return (
        <div 
          className="text-sm font-medium text-gray-500 pt-2 pb-1 border-b border-gray-200"
          role="heading"
          aria-level={3}
        >
          {item.text}
        </div>
      );
    }
    
    // Find the actual index in the non-header items list
    const nonHeaderIndex = nonHeaderItems.findIndex(nonHeaderItem => 
      nonHeaderItem === item
    );
    
    return (
      <div
        ref={(el: HTMLDivElement | null) => {
          if (el) {
            suggestionRefs.current[index] = el;
          }
        }}
        className={`p-3 bg-white rounded-lg border ${
          isFocused ? 'border-green-500 bg-bamboo-light ring-2 ring-green-500' : 'border-gray-200'
        } hover:bg-bamboo-light hover:border-green-500 cursor-pointer transition-colors`}
        onClick={() => onSelect(item)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onSelect(item);
          }
        }}
        role="option"
        aria-selected={isFocused}
        tabIndex={isFocused ? 0 : -1}
        id={`suggestion-${index}`}
      >
        <MotionDiv
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: Math.min(index * 0.05, 0.5) }}
        >
          <div className="flex items-center">
            <div 
              className="flex items-center justify-center w-10 h-10 bg-green-100 text-green-800 rounded-full mr-3 text-xl"
              aria-hidden="true"
            >
              {getIcon(item.type)}
            </div>
            <div className="flex-1">
              <div className="font-medium">{item.name}</div>
              {item.type !== 'country' && item.formattedName && (
                <div className="text-sm text-gray-600">{item.formattedName}</div>
              )}
            </div>
            <div className="ml-2" aria-hidden="true">
              <svg className="w-5 h-5 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        </MotionDiv>
      </div>
    );
  });
  
  // Add display name for React.memo component
  SuggestionItem.displayName = 'SuggestionItem';

  // Create popular destination item component
  const PopularDestinationItem = React.memo(({ 
    destination, 
    onClick 
  }: { 
    destination: { name: string; icon: string }; 
    onClick: (name: string) => void;
  }) => (
    <div
      className="p-3 bg-white border border-gray-200 rounded-lg text-center cursor-pointer hover:bg-bamboo-light hover:border-green-500 transition-colors"
      onClick={() => onClick(destination.name)}
      role="button"
      aria-label={`Search for ${destination.name}`}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick(destination.name);
        }
      }}
    >
      <MotionDiv
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <div className="text-2xl mb-1" aria-hidden="true">{destination.icon}</div>
        <div className="font-medium">{destination.name}</div>
      </MotionDiv>
    </div>
  ));
  
  // Add display name for React.memo component
  PopularDestinationItem.displayName = 'PopularDestinationItem';

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
              onClick={onClose}
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
                    onClick={onClose}
                    className="p-2 text-green-800 hover:text-green-600 transition-colors"
                    aria-label="Close destination search"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                
                {/* Selected country pill */}
                {selectedCountry && selectedCountry.properties.country && (
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
                        {selectedCountry.properties.country_code && 
                          String.fromCodePoint(
                            ...selectedCountry.properties.country_code
                              .toUpperCase()
                              .split('')
                              .map(c => 127397 + c.charCodeAt(0))
                          )
                        }
                      </div>
                      <span className="flex-1 font-medium">{selectedCountry.properties.country}</span>
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
                        aria-label={`Unselect ${selectedCountry.properties.country}`}
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
                      placeholder={selectedCountry && selectedCountry.properties.country
                        ? `Find places in ${selectedCountry.properties.country}...` 
                        : "Where would you like to go?"}
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      onKeyDown={handleKeyDown}
                      aria-controls="search-results"
                      aria-activedescendant={focusedIndex >= 0 ? `suggestion-${nonHeaderItems.indexOf(suggestions[focusedIndex])}` : undefined}
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
                  className="p-4 max-h-96 overflow-y-auto"
                  id="search-results"
                  role="listbox"
                  aria-label="Search results"
                >
                  {suggestions.length > 0 ? (
                    <div className="space-y-4">
                      {suggestions.map((item, index) => {
                        // Calculate focused state
                        const isFocused = focusedIndex >= 0 && 
                          nonHeaderItems[focusedIndex] === item;
                        
                        return (
                          <SuggestionItem 
                            key={`item-${index}`}
                            item={item}
                            index={index}
                            isFocused={isFocused}
                            onSelect={handleItemSelect}
                          />
                        );
                      })}
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
                  ) : !query.length && suggestions.length === 0 ? (
                    <div className="py-6">
                      <p className="text-sm font-medium text-gray-500 mb-3">
                        Popular destinations:
                      </p>
                      <div 
                        className="grid grid-cols-2 sm:grid-cols-3 gap-3"
                        role="list"
                        aria-label="Popular destinations"
                      >
                        {popularDestinations.map((dest) => (
                          <PopularDestinationItem
                            key={dest.name}
                            destination={dest}
                            onClick={setQuery}
                          />
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
                
                {/* Footer */}
                <div className="p-4 bg-bamboo-light/50 rounded-b-xl border-t border-green-200 flex justify-between items-center">
                  <div className="text-sm text-green-800">
                    {selectedCountry ? 'Search within country or go back to search all' : 'Search for a country, region, or city'}
                  </div>
                  
                  {/* Show finish button only in multi-select mode */}
                  {multiSelect && selectedDestinations.length > 0 && (
                    <button 
                      className="px-4 py-2 bg-backpack-orange text-white rounded-full hover:bg-backpack-orange/90 transition-colors"
                      onClick={() => {
                        onSelect(selectedDestinations);
                        onClose();
                      }}
                      aria-label={`Done selecting ${selectedDestinations.length} destinations`}
                    >
                      Done ({selectedDestinations.length})
                    </button>
                  )}
                  
                  {/* Back button when inside a country */}
                  {selectedCountry && !multiSelect && (
                    <button 
                      className="px-4 py-2 text-sm bg-white border border-green-500 rounded-full hover:bg-green-50 transition-colors"
                      onClick={() => {
                        setSelectedCountry(null);
                        // Update global assistant when going back to all destinations
                        onStatusChange?.({ 
                          emotion: 'happy', 
                          message: 'Where would you like to explore?'
                        });
                      }}
                      aria-label="Back to all destinations"
                    >
                      Back to All Destinations
                    </button>
                  )}
                </div>
                
                {/* For multi-select, add a prominent finish button at bottom */}
                {multiSelect && selectedDestinations.length > 0 && (
                  <div className="px-4 pb-4">
                    <button 
                      className="mt-4 w-full py-3 bg-backpack-orange text-white rounded-lg font-medium hover:bg-backpack-orange/90 transition-colors"
                      onClick={() => {
                        onSelect(selectedDestinations);
                        onClose();
                      }}
                    >
                      Done - Create Itinerary with {selectedDestinations.length} {selectedDestinations.length === 1 ? 'Destination' : 'Destinations'}
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

// Popular destinations for quick selection
const popularDestinations = [
  { name: 'Japan', icon: '🇯🇵' },
  { name: 'Italy', icon: '🇮🇹' },
  { name: 'Thailand', icon: '🇹🇭' },
  { name: 'France', icon: '🇫🇷' },
  { name: 'Australia', icon: '🇦🇺' },
  { name: 'Singapore', icon: '🇸🇬' }
];

export default DestinationSearchModal;