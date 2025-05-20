'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { PoGuide } from '@/components/po/svg/PoGuide';

type Destination = {
  place_id: string;
  name: string;
  formattedName: string;
  country: string;
  coordinates: [number, number];
};

interface DestinationSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (destination: Destination | Destination[]) => void;
  multiSelect?: boolean;
  existingSelections?: Destination[];
}

const DestinationSearchModal: React.FC<DestinationSearchModalProps> = ({ 
  isOpen, 
  onClose, 
  onSelect,
  multiSelect = false,
  existingSelections = []
}) => {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [selectedCountry, setSelectedCountry] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [poEmotion, setPoEmotion] = useState<'happy' | 'thinking' | 'excited' | 'sad'>('happy');
  const [poMessage, setPoMessage] = useState('Where would you like to explore?');
  const [selectedDestinations, setSelectedDestinations] = useState<Destination[]>(existingSelections || []);
  const inputRef = useRef<HTMLInputElement>(null);
  
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
      }, 300);
    }
  }, [isOpen]);
  
  // Handle search input
  useEffect(() => {
    if (!query || query.length < 2) {
      setSuggestions([]);
      return;
    }
    
    // Update PO's emotions based on search state
    setPoEmotion('thinking');
    setPoMessage(`Let me find places like "${query}" for you...`);
    
    const fetchSuggestions = async () => {
      setIsLoading(true);
      try {
        const apiKey = process.env.NEXT_PUBLIC_GEOAPIFY_API_KEY;
        
        // Build request URL
        const params = new URLSearchParams({
          text: query,
          format: 'json',
          apiKey: apiKey || '',
          filter: 'not.category:commercial,amenity,building.commercial',
          type: selectedCountry ? 'city,district,tourism' : 'country,city',
          limit: '10',
          ...(selectedCountry ? { country: selectedCountry.country_code } : {})
        });
        
        const response = await fetch(
          `https://api.geoapify.com/v1/geocode/autocomplete?${params.toString()}`
        );
        const data = await response.json();
        
        if (data.features && data.features.length > 0) {
          const organizedResults = selectedCountry 
            ? organizeDestinationsInCountry(data)
            : organizeCountryResults(data);
          
          setSuggestions(organizedResults);
          setPoEmotion('excited');
          setPoMessage(`I found ${data.features.length} great places for you!`);
        } else {
          setSuggestions([]);
          setPoEmotion('sad');
          setPoMessage(`I couldn't find any places matching "${query}". Try a different search?`);
        }
      } catch (error) {
        console.error("Error fetching suggestions:", error);
        setSuggestions([]);
        setPoEmotion('sad');
        setPoMessage("Oh no! I had trouble searching for places. Let's try again!");
      } finally {
        setIsLoading(false);
      }
    };
    
    const debounce = setTimeout(fetchSuggestions, 500);
    return () => clearTimeout(debounce);
  }, [query, selectedCountry]);
  
  // Handle destination addition
  const handleDestinationAdd = (item: any) => {
    // Add to selected destinations list
    const newDestination = {
      place_id: item.full.properties.place_id,
      name: item.name,
      formattedName: item.formattedName,
      country: item.full.properties.country,
      coordinates: item.full.geometry.coordinates
    };
    
    setSelectedDestinations(prev => [...prev, newDestination]);
    
    // Update PO's emotion and message
    setPoEmotion('excited');
    setPoMessage(`${item.name} added! Select more destinations or click "Done" when finished.`);
    
    // Clear input to encourage more selections
    setQuery('');
  };
  
  // Handle item selection
  const handleItemSelect = (item: any) => {
    if (item.type === 'country') {
      setSelectedCountry(item.full);
      setPoEmotion('excited');
      setPoMessage(`Great choice! Let's explore ${item.name}! What places interest you?`);
      setQuery('');
      if (inputRef.current) inputRef.current.focus();
    } else if (multiSelect) {
      handleDestinationAdd(item);
    } else {
      // Close the modal and pass the selection to parent
      setPoEmotion('happy');
      onSelect({
        place_id: item.full.properties.place_id,
        name: item.name,
        formattedName: item.formattedName,
        country: item.full.properties.country,
        coordinates: item.full.geometry.coordinates
      });
      onClose();
    }
  };
  
  // Organize country results
  function organizeCountryResults(geoapifyResults: any) {
    const features = geoapifyResults.features || [];
    
    const countries: any[] = [];
    const majorCities: any[] = [];
    const regions: any[] = [];
    
    features.forEach((feature: any) => {
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
  }
  
  // Organize destinations within a country
  function organizeDestinationsInCountry(geoapifyResults: any) {
    const features = geoapifyResults.features || [];
    
    const cities: any[] = [];
    const attractions: any[] = [];
    const districts: any[] = [];
    
    features.forEach((feature: any) => {
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
  }
  
  // Get icon for result type
  const getIcon = (type: string) => {
    switch(type) {
      case 'country': return '🌍';
      case 'city': return '🏙️';
      case 'region': return '🗺️';
      case 'attraction': return '🏛️';
      case 'district': return '🏘️';
      default: return '📍';
    }
  };

  // Render selected destinations
  const renderSelectedDestinations = () => (
    <div className="mx-4 mt-2 mb-4">
      <div className="text-sm font-medium text-gray-500 mb-2">Selected Destinations:</div>
      <div className="flex flex-wrap gap-2">
        {selectedDestinations.map((dest, index) => (
          <div 
            key={`selected-${index}`} 
            className="flex items-center px-3 py-1 bg-green-100 text-green-800 rounded-full"
          >
            <span>{dest.name}</span>
            <button 
              className="ml-1 p-1 hover:bg-green-200 rounded-full transition-colors"
              onClick={() => {
                setSelectedDestinations(prev => prev.filter((_, i) => i !== index));
                setPoEmotion('thinking');
                setPoMessage(`Removed ${dest.name}. Anything else you'd like to explore?`);
              }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div 
            className="relative w-full max-w-3xl p-1 bg-white rounded-xl shadow-xl"
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.7, opacity: 0 }}
            transition={{ 
              type: "spring", 
              stiffness: 300, 
              damping: 30 
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Bamboo-themed header */}
            <div className="flex items-center p-4 bg-bamboo-light rounded-t-xl border-b-2 border-green-500">
              <div className="w-20 h-20 mr-4">
                <Image
                  src={`/images/po/${poEmotion}.png`}
                  alt="PO the Travel Panda"
                  width={80}
                  height={80}
                  className="object-contain animate-bounce-gentle"
                />
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-green-800">Find Your Destination</h2>
                <p className="text-green-700">{poMessage}</p>
              </div>
              <button 
                onClick={onClose}
                className="p-2 text-green-800 hover:text-green-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* Selected country pill */}
            {selectedCountry && (
              <motion.div 
                className="mx-4 mt-4 flex items-center p-2 bg-backpack-orange/10 rounded-full"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1 }}
              >
                <div className="flex items-center justify-center w-8 h-8 bg-backpack-orange text-white rounded-full mr-2">
                  {selectedCountry.country_code && 
                    String.fromCodePoint(...selectedCountry.country_code
                      .toUpperCase()
                      .split('')
                      .map((c: string) => 127397 + c.charCodeAt(0)))}
                </div>
                <span className="flex-1 font-medium">{selectedCountry.properties.country}</span>
                <button 
                  className="p-1 hover:bg-backpack-orange/20 rounded-full transition-colors"
                  onClick={() => {
                    setSelectedCountry(null);
                    setPoEmotion('thinking');
                    setPoMessage("Let's search for a different destination!");
                  }}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </motion.div>
            )}
            
            {/* Multi-select destinations */}
            {multiSelect && selectedDestinations.length > 0 && renderSelectedDestinations()}
            
            {/* Search input */}
            <div className="p-4">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  ref={inputRef}
                  type="text"
                  className="block w-full pl-10 pr-4 py-3 border border-gray-300 rounded-full text-lg focus:ring-2 focus:ring-backpack-orange focus:border-transparent transition-all"
                  placeholder={selectedCountry 
                    ? `Find places in ${selectedCountry.properties.country}...` 
                    : "Where would you like to go?"}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
                {isLoading && (
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                    <div className="w-5 h-5 border-t-2 border-backpack-orange rounded-full animate-spin"></div>
                  </div>
                )}
              </div>
            </div>
            
            {/* Results */}
            <div className="p-4 max-h-96 overflow-y-auto">
              {suggestions.length > 0 ? (
                <div className="space-y-4">
                  {suggestions.map((item, index) => {
                    if (item.isHeader) {
                      return (
                        <div 
                          key={`header-${index}`} 
                          className="text-sm font-medium text-gray-500 pt-2 pb-1 border-b border-gray-200"
                        >
                          {item.text}
                        </div>
                      );
                    }
                    
                    return (
                      <motion.div
                        key={`item-${index}`}
                        className="p-3 bg-white rounded-lg border border-gray-200 hover:bg-bamboo-light hover:border-green-500 cursor-pointer transition-colors"
                        onClick={() => handleItemSelect(item)}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <div className="flex items-center">
                          <div className="flex items-center justify-center w-10 h-10 bg-green-100 text-green-800 rounded-full mr-3 text-xl">
                            {getIcon(item.type)}
                          </div>
                          <div className="flex-1">
                            <div className="font-medium">{item.name}</div>
                            {item.type !== 'country' && (
                              <div className="text-sm text-gray-600">{item.formattedName}</div>
                            )}
                          </div>
                          <div className="ml-2">
                            <svg className="w-5 h-5 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              ) : query.length > 1 && !isLoading ? (
                <div className="py-12 flex flex-col items-center justify-center">
                  <div className="w-32 h-32 mb-6">
                    <PoGuide 
                      message="No places found! Try a different search."
                      type="sad"
                      size="medium"
                      animated={true}
                    />
                  </div>
                  <p className="text-gray-500 text-center max-w-md">
                    Try searching for a country name, city, or famous landmark!
                  </p>
                </div>
              ) : !query.length && suggestions.length === 0 ? (
                <div className="py-6">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {popularDestinations.map((dest) => (
                      <motion.div
                        key={dest.name}
                        className="p-3 bg-white border border-gray-200 rounded-lg text-center cursor-pointer hover:bg-bamboo-light hover:border-green-500 transition-colors"
                        onClick={() => {
                          setQuery(dest.name);
                        }}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <div className="text-2xl mb-1">{dest.icon}</div>
                        <div className="font-medium">{dest.name}</div>
                      </motion.div>
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
                    setPoEmotion('happy');
                    setPoMessage('Where would you like to explore?');
                  }}
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
          </motion.div>
        </motion.div>
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
