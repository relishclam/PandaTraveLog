'use client';

import React, { useState, useEffect, useCallback, useRef, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FocusTrap } from 'focus-trap-react';

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

const MotionDiv = motion.div as React.ForwardRefExoticComponent<
  MotionDivProps & 
  React.HTMLAttributes<HTMLDivElement> & 
  { className?: string }
>;

type Destination = {
  place_id: string;
  name: string;
  formattedName: string;
  country: string;
  coordinates: [number, number];
  type?: string;
};

interface GeoapifyFeatureProperties {
  place_id: string;
  country?: string;
  country_code?: string;
  city?: string;
  state?: string;
  district?: string;
  name?: string;
  formatted: string;
  result_type?: string;
  categories?: string[];
  category?: string;
  address_line1?: string;
  address_line2?: string;
  lon?: number;
  lat?: number;
  population?: number;
  timezone?: any;
  details?: any[];
  datasource?: any;
  rank?: any;
}

type GeoapifyFeature = {
  type: string;
  properties: GeoapifyFeatureProperties;
  geometry: {
    coordinates: [number, number];
  };
  bbox?: [number, number, number, number] | {
    lon1: number;
    lat1: number;
    lon2: number;
    lat2: number;
  };
};

interface GeoapifyGeocodeResult {
  datasource?: {
    sourcename?: string;
    attribution?: string;
    license?: string;
    url?: string;
  };
  country?: string;
  country_code?: string;
  name?: string;
  city?: string;
  state?: string;
  district?: string;
  formatted?: string;
  address_line1?: string;
  address_line2?: string;
  place_id: string;
  lon?: number;
  lat?: number;
  result_type?: string;
  category?: string;
  plus_code?: string;
  plus_code_short?: string;
  rank?: any;
  bbox?: {
    lon1: number;
    lat1: number;
    lon2: number;
    lat2: number;
  };
}

interface GeoapifyFullResult {
  place_id: string;
  name?: string;
  formatted?: string;
  country?: string;
  country_code?: string;
  city?: string;
  lon?: number;
  lat?: number;
  result_type?: string;
  state?: string;
  district?: string;
  address_line1?: string;
  address_line2?: string;
  categories?: string[];
  category?: string;
  population?: number;
  timezone?: string;
  bbox?: {
    lon1: number;
    lat1: number;
    lon2: number;
    lat2: number;
  } | [number, number, number, number];
}

type SuggestionItem = 
  | {
      isHeader: true;
      text: string;
      id: string;
      name: '';
      formattedName: '';
    }
  | {
      isHeader?: false;
      id: string;
      name: string;
      formattedName: string;
      full: GeoapifyFullResult;
      type?: string;
      country?: string;
      country_code?: string;
      city?: string;
      latitude?: number;
      longitude?: number;
      result_type?: string;
      category?: string[];
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
  emotion?: 'happy' | 'thinking' | 'excited' | 'sad';
  message?: string;
}

type SuggestionItemComponentProps = {
  item: SuggestionItem;
  onSelectItem: (item: SuggestionItem) => void;
  isFocused: boolean;
  isSelected: boolean;
  multiSelect?: boolean;
  id: string;
};

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
      <div className="px-4 py-2 text-sm font-semibold text-gray-500 bg-gray-50 rounded-md"
        role="separator"
        id={id}>
        {item.text}
      </div>
    );
  }

  const displayType = () => {
    if (item.type === 'city') return 'City';
    if (item.type === 'attraction') return 'Attraction';
    return item.type || 'Place';
  };

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
      tabIndex={0}
      id={id}
    >
      <motion.div
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
      >
        <div className="flex items-center">
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-lg mr-3"
            aria-hidden="true">
            {getIcon(item.type)}
          </div>
          <div className="flex-grow min-w-0">
            <p className={`font-semibold text-gray-800 ${isFocused ? 'text-blue-600' : ''}`}>
              {item.name}
            </p>
            <div className="flex items-center">
              <span className="text-xs bg-gray-100 px-2 py-1 rounded mr-2">
                {displayType()}
              </span>
              {item.formattedName && (
                <p className={`text-sm text-gray-500 ${isFocused ? 'text-blue-500' : ''}`}>
                  {item.formattedName}
                </p>
              )}
            </div>
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

const getIcon = (type?: string) => {
  switch (type) {
    case 'country': return '🌍';
    case 'city': return '🏙️';
    case 'state': return '🏞️';
    case 'administrative': return '🏛️';
    case 'tourism': return '🏖️';
    case 'attraction': return '🏖️';
    case 'natural': return '🌲';
    case 'airport': return '✈️';
    default: return '📍';
  }
};

const countryNameToCodeMap: Record<string, string> = {
  // Existing entries
  "malaysia": "my",
  "thailand": "th",
  "singapore": "sg",
  "japan": "jp",
  "vietnam": "vn",
  "united states": "us",
  "united states of america": "us",
  "united kingdom": "gb",
  "great britain": "gb",
  "france": "fr",
  "germany": "de",
  "canada": "ca",
  "australia": "au",
  "china": "cn",
  "india": "in",
  "brazil": "br",
  "south africa": "za",
  "usa": "us",
  "america": "us",
  "uk": "gb",
  "england": "gb",
  "uae": "ae",
  "emirates": "ae",
  
  // Major European countries
  "spain": "es",
  "italy": "it",
  "portugal": "pt",
  "netherlands": "nl",
  "holland": "nl",
  "belgium": "be",
  "switzerland": "ch",
  "austria": "at",
  "sweden": "se",
  "norway": "no",
  "denmark": "dk",
  "finland": "fi",
  "poland": "pl",
  "czech republic": "cz",
  "czechia": "cz",
  "hungary": "hu",
  "romania": "ro",
  "bulgaria": "bg",
  "croatia": "hr",
  "greece": "gr",
  "turkey": "tr",
  "russia": "ru",
  "ukraine": "ua",
  "ireland": "ie",
  "iceland": "is",
  
  // Asian countries
  "south korea": "kr",
  "korea": "kr",
  "north korea": "kp",
  "indonesia": "id",
  "philippines": "ph",
  "taiwan": "tw",
  "hong kong": "hk",
  "macau": "mo",
  "myanmar": "mm",
  "burma": "mm",
  "cambodia": "kh",
  "laos": "la",
  "bangladesh": "bd",
  "pakistan": "pk",
  "sri lanka": "lk",
  "nepal": "np",
  "bhutan": "bt",
  "maldives": "mv",
  "afghanistan": "af",
  "iran": "ir",
  "iraq": "iq",
  "israel": "il",
  "palestine": "ps",
  "jordan": "jo",
  "lebanon": "lb",
  "syria": "sy",
  "saudi arabia": "sa",
  "kuwait": "kw",
  "qatar": "qa",
  "bahrain": "bh",
  "oman": "om",
  "yemen": "ye",
  "uzbekistan": "uz",
  "kazakhstan": "kz",
  "kyrgyzstan": "kg",
  "tajikistan": "tj",
  "turkmenistan": "tm",
  "mongolia": "mn",
  
  // African countries
  "egypt": "eg",
  "morocco": "ma",
  "tunisia": "tn",
  "algeria": "dz",
  "libya": "ly",
  "sudan": "sd",
  "ethiopia": "et",
  "kenya": "ke",
  "tanzania": "tz",
  "uganda": "ug",
  "rwanda": "rw",
  "ghana": "gh",
  "nigeria": "ng",
  "senegal": "sn",
  "ivory coast": "ci",
  "cote d'ivoire": "ci",
  "mali": "ml",
  "burkina faso": "bf",
  "niger": "ne",
  "chad": "td",
  "cameroon": "cm",
  "central african republic": "cf",
  "democratic republic of congo": "cd",
  "congo": "cg",
  "gabon": "ga",
  "equatorial guinea": "gq",
  "sao tome and principe": "st",
  "cape verde": "cv",
  "guinea": "gn",
  "guinea-bissau": "gw",
  "sierra leone": "sl",
  "liberia": "lr",
  "togo": "tg",
  "benin": "bj",
  "mauritania": "mr",
  "gambia": "gm",
  "botswana": "bw",
  "namibia": "na",
  "zambia": "zm",
  "zimbabwe": "zw",
  "mozambique": "mz",
  "madagascar": "mg",
  "mauritius": "mu",
  "seychelles": "sc",
  "comoros": "km",
  "djibouti": "dj",
  "eritrea": "er",
  "somalia": "so",
  "south sudan": "ss",
  "malawi": "mw",
  "lesotho": "ls",
  "swaziland": "sz",
  "eswatini": "sz",
  
  // American countries
  "mexico": "mx",
  "guatemala": "gt",
  "belize": "bz",
  "el salvador": "sv",
  "honduras": "hn",
  "nicaragua": "ni",
  "costa rica": "cr",
  "panama": "pa",
  "cuba": "cu",
  "jamaica": "jm",
  "haiti": "ht",
  "dominican republic": "do",
  "puerto rico": "pr",
  "trinidad and tobago": "tt",
  "barbados": "bb",
  "bahamas": "bs",
  "colombia": "co",
  "venezuela": "ve",
  "guyana": "gy",
  "suriname": "sr",
  "french guiana": "gf",
  "ecuador": "ec",
  "peru": "pe",
  "bolivia": "bo",
  "paraguay": "py",
  "uruguay": "uy",
  "argentina": "ar",
  "chile": "cl",
  
  // Oceania
  "new zealand": "nz",
  "fiji": "fj",
  "papua new guinea": "pg",
  "solomon islands": "sb",
  "vanuatu": "vu",
  "new caledonia": "nc",
  "french polynesia": "pf",
  "samoa": "ws",
  "tonga": "to",
  "kiribati": "ki",
  "tuvalu": "tv",
  "nauru": "nr",
  "palau": "pw",
  "marshall islands": "mh",
  "micronesia": "fm",
  
  // Additional common variations and territories
  "scotland": "gb",
  "wales": "gb",
  "northern ireland": "gb",
  "virgin islands": "vi",
  "guam": "gu",
  "american samoa": "as",
  "greenland": "gl",
  "faroe islands": "fo",
  "gibraltar": "gi",
  "malta": "mt",
  "cyprus": "cy",
  "luxembourg": "lu",
  "liechtenstein": "li",
  "monaco": "mc",
  "san marino": "sm",
  "vatican": "va",
  "vatican city": "va",
  "andorra": "ad",
  "kosovo": "xk",
  "montenegro": "me",
  "north macedonia": "mk",
  "macedonia": "mk",
  "bosnia and herzegovina": "ba",
  "bosnia": "ba",
  "herzegovina": "ba",
  "serbia": "rs",
  "albania": "al",
  "moldova": "md",
  "belarus": "by",
  "lithuania": "lt",
  "latvia": "lv",
  "estonia": "ee",
  "georgia": "ge",
  "armenia": "am",
  "azerbaijan": "az",
};

const getCountryCode = (countryName: string): string | null => {
  return countryNameToCodeMap[countryName.toLowerCase()] || null;
};

const getPopularDestinations = (): SuggestionItem[] => [
  { 
    id: 'popular-header',
    isHeader: true, 
    text: '\u2728 Popular Destinations',
    name: '',
    formattedName: ''
  },
  { 
    id: 'paris',
    name: 'Paris', 
    formattedName: 'Paris, France', 
    type: 'city', 
    full: { 
      place_id: 'paris', 
      name: 'Paris', 
      formatted: 'Paris, France', 
      country: 'France', 
      country_code: 'fr',
      lon: 2.3522, 
      lat: 48.8566,
      population: 2148000,
      timezone: 'Europe/Paris'
    } 
  },
  { 
    id: 'tokyo',
    name: 'Tokyo', 
    formattedName: 'Tokyo, Japan', 
    type: 'city', 
    full: { 
      place_id: 'tokyo', 
      name: 'Tokyo', 
      formatted: 'Tokyo, Japan', 
      country: 'Japan', 
      country_code: 'jp',
      lon: 139.6917, 
      lat: 35.6895,
      population: 13960000,
      timezone: 'Asia/Tokyo'
    } 
  },
  { 
    id: 'new-york',
    name: 'New York', 
    formattedName: 'New York, USA', 
    type: 'city', 
    full: { 
      place_id: 'new-york', 
      name: 'New York', 
      formatted: 'New York, USA', 
      country: 'United States', 
      country_code: 'us',
      lon: -74.0060, 
      lat: 40.7128,
      population: 8419000,
      timezone: 'America/New_York'
    } 
  }
];

const createHeaderSuggestion = (id: string, text: string): SuggestionItem => ({
  id,
  text,
  isHeader: true,
  name: '',
  formattedName: ''
});

// First, ensure this is placed before any code that uses placeToSuggestion
const placeToSuggestion = (place: GeoapifyFeature | GeoapifyGeocodeResult): SuggestionItem => {
  const props = 'properties' in place ? place.properties : place;
  const coordinates = 'geometry' in place ? place.geometry.coordinates : [place.lon ?? 0, place.lat ?? 0];
  const placeId = props.place_id || `temp-${Date.now()}`;
  
  // Safely get categories array
  const categoryArray = ('categories' in props ? props.categories : undefined) || 
                       (props.category ? [props.category] : undefined);
  
  // Type-safe tourism check
  const isTourismRelated = categoryArray?.some((c: string) => 
    ['tourism', 'entertainment', 'leisure', 'catering', 'accommodation', 'attraction']
      .some(keyword => c.toLowerCase().includes(keyword))) || false;
  
  const type = props.result_type || (isTourismRelated ? 'attraction' : 'location');

  // Create the full result object with proper typing
  const fullResult: GeoapifyFullResult = {
    ...props,
    place_id: placeId,
    lon: coordinates[0],
    lat: coordinates[1],
    categories: categoryArray,
    category: props.category
  };

  return {
    id: placeId,
    name: props.name || props.city || props.address_line1 || 'Location',
    formattedName: props.formatted || `${props.city || ''}${props.city && props.country ? ', ' : ''}${props.country || ''}`,
    type,
    full: fullResult,
    country: props.country,
    country_code: props.country_code,
    city: props.city,
    latitude: coordinates[1],
    longitude: coordinates[0],
    result_type: props.result_type,
    category: categoryArray
  };
};

// Organize geographical search results in hierarchical order
const organizeGeographicalResults = (
  countries: GeoapifyFeature[], 
  cities: GeoapifyFeature[], 
  otherPlaces: GeoapifyFeature[], 
  searchQuery: string
): SuggestionItem[] => {
  const suggestions: SuggestionItem[] = [];
  
  // Add countries first
  if (countries.length > 0) {
    suggestions.push(createHeaderSuggestion('countries-header', '🌍 Countries'));
    suggestions.push(...countries.slice(0, 3).map(placeToSuggestion)); // Limit to top 3 countries
  }
  
  // Add cities second
  if (cities.length > 0) {
    suggestions.push(createHeaderSuggestion('cities-header', '🏙️ Cities & Towns'));
    suggestions.push(...cities.slice(0, 8).map(placeToSuggestion)); // Limit to top 8 cities
  }
  
  // Add other geographical places (states, districts, etc.)
  if (otherPlaces.length > 0) {
    suggestions.push(createHeaderSuggestion('places-header', '📍 Places of Interest'));
    // Filter out any business/commercial results and only show geographical places
    const geographicalPlaces = otherPlaces.filter(place => {
      const props = place.properties;
      const resultType = props.result_type;
      // Only include geographical result types, exclude commercial/business types
      return resultType && [
        'state', 'district', 'administrative', 'locality', 'suburb', 
        'neighbourhood', 'island', 'natural_feature'
      ].includes(resultType);
    });
    suggestions.push(...geographicalPlaces.slice(0, 5).map(placeToSuggestion));
  }
  
  // If no results found, show popular destinations
  if (suggestions.length === 0) {
    return getPopularDestinations();
  }
  
  return suggestions;
};

// Then update the organize functions to use proper typing
const organizeCountryResults = (countryResults: GeoapifyFeature[], places: GeoapifyFeature[]): SuggestionItem[] => {
  const suggestions: SuggestionItem[] = [];
  
  if (countryResults.length === 0) return suggestions;

  // Add the country itself first
  suggestions.push(createHeaderSuggestion('country-header', `🌍 ${countryResults[0].properties.country || countryResults[0].properties.name || 'Country'}`));
  suggestions.push(...countryResults.slice(0, 1).map(placeToSuggestion));

  // Filter and organize cities
  const cities = places.filter(p => 
    p.properties?.result_type === 'city' || 
    p.properties?.result_type === 'town'
  );

  // Filter geographical places of interest (exclude commercial businesses)
  const geographicalPlaces = places.filter(p => {
    const resultType = p.properties?.result_type;
    return resultType && [
      'state', 'district', 'administrative', 'locality', 'island', 'natural_feature'
    ].includes(resultType);
  });

  if (cities.length > 0) {
    suggestions.push(createHeaderSuggestion('cities-header', '🏙️ Major Cities'));
    suggestions.push(...cities.slice(0, 8).map(placeToSuggestion));
  }

  if (geographicalPlaces.length > 0) {
    suggestions.push(createHeaderSuggestion('places-header', '📍 Places of Interest'));
    suggestions.push(...geographicalPlaces.slice(0, 5).map(placeToSuggestion));
  }

  return suggestions;
};

const organizeCityResults = (
  city: GeoapifyGeocodeResult, 
  attractionsRes: { features?: GeoapifyFeature[] }, 
  citiesRes: { results?: GeoapifyGeocodeResult[] }
): SuggestionItem[] => {
  const suggestions: SuggestionItem[] = [];
  
  suggestions.push(createHeaderSuggestion('city-header', `Places in ${city.city || city.name || 'City'}`));

  const attractions = attractionsRes?.features || [];
  if (attractions.length > 0) {
    suggestions.push(...attractions.map(placeToSuggestion));
  }

  const nearbyCities = citiesRes?.results?.filter((c: GeoapifyGeocodeResult) => 
    c.place_id !== city.place_id
  ) || [];
  
  if (nearbyCities.length > 0) {
    suggestions.push(createHeaderSuggestion('nearby-header', 'Nearby Cities'));
    suggestions.push(...nearbyCities.map(placeToSuggestion));
  }

  return suggestions;
};

const DestinationSearchModal: React.FC<DestinationSearchModalProps> = ({
  isOpen,
  doHandleClose,
  onSelect,
  multiSelect = false,
  existingSelections = [],
  onStatusChange
}) => {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([]);
  const [selectedCountry, setSelectedCountry] = useState<GeoapifyFullResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedDestinations, setSelectedDestinations] = useState<Destination[]>(existingSelections || []);
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchSuggestions = useCallback(async (currentQuery: string) => {
    const apiKey = process.env.NEXT_PUBLIC_GEOAPIFY_API_KEY;
    if (!apiKey) {
      console.error("Geoapify API key is not set.");
      setSuggestions(getPopularDestinations());
      setError("API key not configured. Displaying popular destinations.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      if (!currentQuery.trim()) {
        setSuggestions(getPopularDestinations());
        setIsLoading(false);
        return;
      }

      if (onStatusChange) onStatusChange({
        emotion: 'thinking',
        message: `Let me find places like "${currentQuery}" for you...`
      });

      const potentialCountryCode = getCountryCode(currentQuery);
      const isCountrySearch = !!potentialCountryCode;

      if (isCountrySearch) {
        // Search for the country first
        const countryUrl = `https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(currentQuery)}&type=country&limit=5&apiKey=${apiKey}`;
        const countryResponse = await fetch(countryUrl);
        
        if (!countryResponse.ok) {
          console.error('Geoapify country search failed:', countryResponse.status, countryResponse.statusText);
          throw new Error(`Geoapify API error: ${countryResponse.status}`);
        }
        
        const countryData = await countryResponse.json();

        if (countryData?.features?.length > 0) {
          const country = countryData.features[0];
          
          // Search for major cities and geographical places in the country
          const citiesUrl = `https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(currentQuery)}&type=city&limit=10&apiKey=${apiKey}`;
          const placesUrl = `https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(currentQuery)}&type=state,district&limit=10&apiKey=${apiKey}`;
          
          const [citiesResponse, placesResponse] = await Promise.all([
            fetch(citiesUrl),
            fetch(placesUrl)
          ]);
          
          const citiesData = citiesResponse.ok ? await citiesResponse.json() : { features: [] };
          const placesData = placesResponse.ok ? await placesResponse.json() : { features: [] };
          
          const organized = organizeCountryResults(
            countryData.features, 
            [...(citiesData.features || []), ...(placesData.features || [])]
          );
          setSuggestions(organized);
        } else {
          setError("No results found for this country.");
          setSuggestions(getPopularDestinations());
        }
      } else {
        // Fallback strategy: Try both country and city search for unrecognized queries
        let searchSuccessful = false;
        
        // Step 1: Search for exact country matches first
        try {
          const countrySearchUrl = `https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(currentQuery)}&type=country&limit=5&lang=en&apiKey=${apiKey}`;
          const countryResponse = await fetch(countrySearchUrl);
          
          if (countryResponse.ok) {
            const countryData = await countryResponse.json();
            
            if (countryData?.features?.length > 0) {
              // Sort countries by relevance - exact matches first
              const sortedCountries = countryData.features.sort((a: any, b: any) => {
                const aName = (a.properties.country || a.properties.name || '').toLowerCase();
                const bName = (b.properties.country || b.properties.name || '').toLowerCase();
                const query = currentQuery.toLowerCase();
                
                // Exact match gets highest priority
                if (aName === query && bName !== query) return -1;
                if (bName === query && aName !== query) return 1;
                
                // Starts with query gets second priority
                if (aName.startsWith(query) && !bName.startsWith(query)) return -1;
                if (bName.startsWith(query) && !aName.startsWith(query)) return 1;
                
                return 0;
              });
              
              const bestCountryMatch = sortedCountries[0];
              const countryCode = bestCountryMatch.properties.country_code;
              
              console.log(`Found country match: ${bestCountryMatch.properties.country || bestCountryMatch.properties.name} (${countryCode})`);
              
              // Step 2: Search for cities within this specific country using proper filter
              const citiesInCountryUrl = `https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(currentQuery)}&type=city&filter=countrycode:${countryCode}&limit=10&lang=en&apiKey=${apiKey}`;
              const citiesResponse = await fetch(citiesInCountryUrl);
              const citiesData = citiesResponse.ok ? await citiesResponse.json() : { features: [] };
              
              // Step 3: Search for major places/states within the country
              const placesInCountryUrl = `https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(currentQuery)}&type=state&filter=countrycode:${countryCode}&limit=5&lang=en&apiKey=${apiKey}`;
              const placesResponse = await fetch(placesInCountryUrl);
              const placesData = placesResponse.ok ? await placesResponse.json() : { features: [] };
              
              const organized = organizeCountryResults(
                [bestCountryMatch], 
                [...(citiesData.features || []), ...(placesData.features || [])]
              );
              setSuggestions(organized);
              searchSuccessful = true;
            }
          }
        } catch (error) {
          console.log('Country-specific search failed, trying general search...', error);
        }
        
        // If no country match, try separate searches for different types
        if (!searchSuccessful) {
          try {
            // Search for cities worldwide (sorted by popularity)
            const citySearchUrl = `https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(currentQuery)}&type=city&limit=10&lang=en&apiKey=${apiKey}`;
            const cityResponse = await fetch(citySearchUrl);
            
            // Search for states/regions worldwide
            const stateSearchUrl = `https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(currentQuery)}&type=state&limit=5&lang=en&apiKey=${apiKey}`;
            const stateResponse = await fetch(stateSearchUrl);
            
            const [cityData, stateData] = await Promise.all([
              cityResponse.ok ? cityResponse.json() : { features: [] },
              stateResponse.ok ? stateResponse.json() : { features: [] }
            ]);
            
            const allResults = [
              ...(cityData.features || []),
              ...(stateData.features || [])
            ];
            
            if (allResults.length > 0) {
              console.log(`Found ${allResults.length} geographical results for "${currentQuery}"`);
              
              // Filter results to only include relevant matches
              const filteredResults = allResults.filter((f: any) => {
                const name = (f.properties.name || f.properties.city || f.properties.state || '').toLowerCase();
                const country = (f.properties.country || '').toLowerCase();
                const query = currentQuery.toLowerCase();
                
                // Only include results where the name actually matches the search query
                return name.includes(query) || name.startsWith(query) || 
                       (name.length > 0 && query.includes(name));
              });
              
              // Sort by relevance and accuracy
              filteredResults.sort((a: any, b: any) => {
                const aName = (a.properties.name || a.properties.city || a.properties.state || '').toLowerCase();
                const bName = (b.properties.name || b.properties.city || b.properties.state || '').toLowerCase();
                const query = currentQuery.toLowerCase();
                
                // Exact match gets highest priority
                if (aName === query && bName !== query) return -1;
                if (bName === query && aName !== query) return 1;
                
                // Starts with query gets second priority
                if (aName.startsWith(query) && !bName.startsWith(query)) return -1;
                if (bName.startsWith(query) && !aName.startsWith(query)) return 1;
                
                // Cities get priority over states
                if (a.properties.result_type === 'city' && b.properties.result_type !== 'city') return -1;
                if (b.properties.result_type === 'city' && a.properties.result_type !== 'city') return 1;
                
                return 0;
              });
              
              // Organize results by type
              const countries: GeoapifyFeature[] = []; // No countries in this fallback
              const cities = filteredResults.filter((f: any) => f.properties.result_type === 'city');
              const otherPlaces = filteredResults.filter((f: any) => f.properties.result_type !== 'city');
              
              const organized = organizeGeographicalResults(countries, cities, otherPlaces, currentQuery);
              setSuggestions(organized);
              searchSuccessful = true;
            }
          } catch (fallbackError) {
            console.log('Fallback geographical search failed:', fallbackError);
          }
        }
        
        // If country search didn't work, try city search
        if (!searchSuccessful) {
          const cityUrl = `https://api.geoapify.com/v1/geocode/search?` +
            `name=${encodeURIComponent(currentQuery)}&` +
            `format=json&apiKey=${apiKey}&limit=10&lang=en`;
            
          const response = await fetch(cityUrl);
          
          if (!response.ok) {
            console.error('Geoapify city search failed:', response.status, response.statusText);
            throw new Error(`Geoapify API error: ${response.status}`);
          }
          
          const data = await response.json();

          if (data?.results?.length > 0) {
            const mainResult = data.results[0];
            
            if (mainResult.result_type === 'city') {
              const attractionsUrl = `https://api.geoapify.com/v2/places?` +
                `categories=tourism,entertainment&` +
                `filter=circle:${mainResult.lon},${mainResult.lat},10000&` +
                `limit=15&apiKey=${apiKey}`;
                
              const attractionsResponse = await fetch(attractionsUrl);
              const attractionsData = await attractionsResponse.json();
              
              const citiesUrl = `https://api.geoapify.com/v1/geocode/search?` +
                `name=${encodeURIComponent(currentQuery)}&` +
                `type=city&` +
                `filter=circle:${mainResult.lon},${mainResult.lat},50000&` +
                `format=json&limit=5&apiKey=${apiKey}`;
                
              const citiesResponse = await fetch(citiesUrl);
              const citiesData = await citiesResponse.json();
              
              const organized = organizeCityResults(
                mainResult,
                attractionsData,
                citiesData
              );
              setSuggestions(organized);
            } else {
              setSuggestions(data.results.map((result: GeoapifyGeocodeResult) => placeToSuggestion(result)));
            }
          } else {
            setError("No results found for your search.");
            setSuggestions(getPopularDestinations());
          }
        }
      }
    } catch (error: any) {
      console.error("Error fetching suggestions:", error);
      setError(error.message || "Failed to fetch suggestions.");
      setSuggestions(getPopularDestinations());
      if (onStatusChange) onStatusChange({
        emotion: 'sad',
        message: `Oops! Something went wrong while searching. ${error.message}`
      });
    } finally {
      setIsLoading(false);
    }
  }, [onStatusChange]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (isOpen) {
        fetchSuggestions(query);
      }
    }, 500);
    
    return () => clearTimeout(timer);
  }, [query, isOpen, fetchSuggestions]);
  
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSuggestions([]);
      setError(null);
      setSelectedCountry(null);
      
      if (inputRef.current) {
        setTimeout(() => {
          inputRef.current?.focus();
        }, 100);
      }
      
      if (!query.trim()) {
        setSuggestions(getPopularDestinations());
      }
    }
  }, [isOpen]);

  const nonHeaderItems = React.useMemo(() => suggestions.filter(s => !s.isHeader), [suggestions]);

  const renderSelectedDestinations = () => {
    return (
      <div className="mx-4 mt-2">
        <div className="flex flex-wrap gap-2">
          {selectedDestinations.map((dest) => (
            <div 
              key={dest.place_id} 
              className="flex items-center bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm"
            >
              <span className="mr-1">{dest.name}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const updatedSelections = selectedDestinations.filter(d => d.place_id !== dest.place_id);
                  setSelectedDestinations(updatedSelections);
                }}
                className="ml-1 p-1 hover:bg-green-200 rounded-full"
                aria-label={`Remove ${dest.name}`}
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (suggestions.length === 0) return;
    
    const selectableItems = suggestions.filter(item => !item.isHeader);
    const selectableIndices = suggestions.map((item, index) => !item.isHeader ? index : -1).filter(index => index !== -1);
    
    const currentSelectableIndex = selectableIndices.indexOf(focusedIndex);
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (focusedIndex < 0 || focusedIndex >= suggestions.length - 1) {
          setFocusedIndex(selectableIndices[0] || 0);
        } else {
          const nextIndex = selectableIndices[currentSelectableIndex + 1];
          if (nextIndex !== undefined) setFocusedIndex(nextIndex);
        }
        break;
        
      case 'ArrowUp':
        e.preventDefault();
        if (focusedIndex <= 0) {
          setFocusedIndex(selectableIndices[selectableIndices.length - 1] || 0);
        } else {
          const prevIndex = selectableIndices[currentSelectableIndex - 1];
          if (prevIndex !== undefined) setFocusedIndex(prevIndex);
        }
        break;
        
      case 'Enter':
        if (focusedIndex >= 0 && !suggestions[focusedIndex].isHeader) {
          e.preventDefault();
          handleItemSelect(suggestions[focusedIndex]);
        }
        break;
        
      case 'Escape':
        e.preventDefault();
        doHandleClose();
        break;
    }
  };

  const handleItemSelect = useCallback(async (item: SuggestionItem) => {
    if (item.isHeader || !('full' in item)) return;

    if (item.type === 'country' && item.full) {
      setSelectedCountry(item.full);
      setQuery('');
      setSuggestions([]);
      if (onStatusChange) onStatusChange({
        emotion: 'thinking',
        message: `Looking for places in ${item.full.name || item.full.formatted}...`
      });
      if (inputRef.current) inputRef.current.focus();
    } else if (item.full) {
      if (onStatusChange) onStatusChange({
        emotion: 'excited',
        message: `Great choice! Adding ${item.full.name || item.full.formatted}.`
      });

      const newDestination: Destination = {
        place_id: item.full.place_id,
        name: item.full.city || item.full.name || item.full.formatted || 'Unknown Location',
        formattedName: item.full.formatted || 'Unknown Location',
        country: item.full.country || (selectedCountry?.name || ''),
        coordinates: [
          item.full.lon ?? 0,
          item.full.lat ?? 0
        ],
        type: item.type
      };

      if (multiSelect) {
        const isAlreadySelected = selectedDestinations.some(dest => dest.place_id === newDestination.place_id);
        const updatedSelections = isAlreadySelected
          ? selectedDestinations.filter(d => d.place_id !== newDestination.place_id)
          : [...selectedDestinations, newDestination];

        setSelectedDestinations(updatedSelections);
        if (onSelect) {
          onSelect(updatedSelections);
        }
      } else {
        if (onSelect) {
          onSelect(newDestination);
        }
        doHandleClose();
      }
    }
  }, [multiSelect, onSelect, doHandleClose, selectedDestinations, onStatusChange, selectedCountry]);

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
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                onClick={(e: React.MouseEvent) => e.stopPropagation()}
              >
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
                
                {selectedCountry && selectedCountry.country && (
                  <div className="mx-4 mt-4">
                    <MotionDiv 
                      className="flex items-center p-2 bg-backpack-orange/10 rounded-full"
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.1 }}
                    >
                      <div className="flex items-center justify-center w-8 h-8 bg-backpack-orange text-white rounded-full mr-2"
                        aria-hidden="true">
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
                
                {multiSelect && selectedDestinations.length > 0 && renderSelectedDestinations()}
                
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
                        !suggestions[focusedIndex].isHeader && 
                        suggestions[focusedIndex].full?.place_id 
                          ? `suggestion-item-${suggestions[focusedIndex].full.place_id}` 
                          : undefined
                      }
                      aria-expanded={suggestions.length > 0}
                      role="combobox"
                      aria-autocomplete="list"
                    />
                    {isLoading && (
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                        <div className="w-5 h-5 border-t-2 border-backpack-orange rounded-full animate-spin"
                          aria-hidden="true" />
                      </div>
                    )}
                  </div>
                </div>
                
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
                          : `suggestion-item-${item.full?.place_id || index}`;
                        return (
                          <SuggestionItemComponent
                            key={itemId}
                            id={itemId}
                            item={item}
                            onSelectItem={handleItemSelect}
                            isFocused={focusedIndex === index}
                            isSelected={!item.isHeader && selectedDestinations.some(dest => dest.place_id === item.full?.place_id)}
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
                              if (!dest.isHeader && dest.full) {
                                handleItemSelect({
                                  id: dest.id,
                                  name: dest.name,
                                  formattedName: dest.formattedName,
                                  type: dest.type,
                                  full: dest.full
                                });
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