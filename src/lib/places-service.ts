export type PlaceSuggestion = {
  placeId: string;
  description: string;
  mainText: string;
  secondaryText: string;
  types: string[];
  lat?: number;
  lng?: number;
};

export type PlaceDetails = {
  placeId: string;
  name: string;
  formattedAddress: string;
  location: {
    lat: number;
    lng: number;
  };
  lat: number;
  lng: number;
  photos?: {
    url: string;
    attribution: string;
  }[];
  website?: string;
  phoneNumber?: string;
  rating?: number;
  types: string[];
};
import { getCountryCodeByName } from './country-codes';

// Helper: Fetch nearby cities and POIs (points of interest) within a radius from a city
export async function getNearbyCitiesAndPOIs(
  city: PlaceSuggestion,
  radiusKm: number = 100
): Promise<PlaceSuggestion[]> {
  // Check if we have lat/lng coordinates in the city object
  const { lat, lng } = city;
  
  if (!lat || !lng) {
    console.error('Missing coordinates for city:', city.description);
    return [];
  }
  
  // Use environment variable for API key
  const apiKey = process.env.NEXT_PUBLIC_GEOAPIFY_API_KEY;
  
  // Check if the API key is available
  if (!apiKey) {
    console.error('❌ Geoapify API key not found in environment variables!');
    console.error('Please make sure your .env.local file contains NEXT_PUBLIC_GEOAPIFY_API_KEY');
    return [];
  }
  
  // For debugging: Log that we're using an API key (masked for security)
  console.log(`ℹ️ Using Geoapify API key (last 4 chars): ...${apiKey.slice(-4)}`);
  
  const radiusMeters = radiusKm * 1000;
  // You can adjust categories as needed (e.g., tourism.sights, tourism.attraction, city, town, village)
  const categories = 'tourism.sights,tourism.attraction,city,town,village';
  const url = `https://api.geoapify.com/v2/places?categories=${categories}&filter=circle:${lng},${lat},${radiusMeters}&limit=20&apiKey=${apiKey}`;

  try {
    const res = await fetch(url);
    const data = await res.json();
    return (data.features || []).map((feature: any) => ({
      placeId: feature.properties.place_id,
      description: feature.properties.formatted,
      mainText: feature.properties.city || feature.properties.name || feature.properties.state,
      secondaryText: feature.properties.country || feature.properties.state,
      types: feature.properties.categories || [],
      lat: feature.geometry.coordinates[1],
      lng: feature.geometry.coordinates[0],
    }));
  } catch (error) {
    console.error('Error getting nearby cities and POIs from Geoapify:', error);
    return [];
  }
}



export const getPlaceSuggestions = async (
  input: string,
  options?: { country?: string; restrictToCities?: boolean }
): Promise<PlaceSuggestion[]> => {
  // Initialize empty array for suggestions
  const suggestions: PlaceSuggestion[] = [];
  
  try {
    // Early return for invalid input
    if (!input || input.trim().length < 2) {
      return suggestions;
    }
    // Use environment variable for API key
    const apiKey = process.env.NEXT_PUBLIC_GEOAPIFY_API_KEY;

    // Check if the API key is available
    if (!apiKey) {
      console.error('❌ Geoapify API key not found in environment variables!');
      console.error('Please make sure your .env.local file contains NEXT_PUBLIC_GEOAPIFY_API_KEY');
      return [];
    }

    // Log API key details for debugging
    console.log(`ℹ️ Using Geoapify API key (last 4 chars): ...${apiKey.slice(-4)}`);

    // Use Geoapify Geocoding API for general location search (countries, cities, addresses)
    let url = `https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(input.trim())}&apiKey=${apiKey}`;

    // Optionally restrict to country
    if (options?.country) {
      url += `&filter=countrycode:${options.country.toLowerCase()}`;
    }

    console.log("Geocoding API URL being called:", url.replace(apiKey, '****'));

    // Retry logic for geocoding API calls
    const MAX_RETRIES = 3;
    let attempt = 0;

    while (attempt < MAX_RETRIES) {
      try {
        const res = await fetch(url);

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          console.error(`\u274c Geoapify Geocoding API error: ${res.status} ${res.statusText}`, errorData);
          throw new Error(`Geocoding API error: ${res.status}`);
        }

        const data = await res.json();

        // Log the first result for debugging
        if (data.features && data.features.length > 0) {
          console.log('Sample geocode data:', JSON.stringify(data.features[0].properties, null, 2));
        }

        return (data.features || []).map((feature: any) => {
          const props = feature.properties;
          const coordinates = feature.geometry.coordinates;
          return {
            placeId: props.place_id || props.osm_id || props.datasource?.raw?.place_id || '',
            description: props.formatted || props.name,
            mainText: props.name || props.city || props.state || props.country,
            secondaryText: props.country || (props.state ? `${props.state}, ${props.country || ''}` : ''),
            types: [props.result_type || 'location'],
            lat: coordinates[1],
            lng: coordinates[0],
          };
        });
      } catch (error) {
        attempt++;
        console.warn(`Retrying geocoding API call (${attempt}/${MAX_RETRIES})`, error);
        if (attempt === MAX_RETRIES) {
          throw new Error('Geocoding API failed after maximum retries');
        }
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
  } catch (error) {
    console.error('Error getting place suggestions from Geoapify:', error);
    return [];
  }

  // Default return in case no suggestions are found
  return suggestions;
};

export async function getPlaceDetails(placeId: string) {
  try {
    // Use environment variable for API key
    const apiKey = process.env.NEXT_PUBLIC_GEOAPIFY_API_KEY;
    
    // Check if the API key is available
    if (!apiKey) {
      console.error('❌ Geoapify API key not found in environment variables!');
      console.error('Please make sure your .env.local file contains NEXT_PUBLIC_GEOAPIFY_API_KEY');
      return null;
    }

    // For debugging: Log that we're using an API key (masked for security)
    console.log(`ℹ️ Using Geoapify API key (last 4 chars): ...${apiKey.slice(-4)}`);

    const url = `https://api.geoapify.com/v2/place-details?id=${encodeURIComponent(placeId)}&apiKey=${apiKey}`;
    console.log('Place details URL:', url.replace(apiKey, '****'));
    const response = await fetch(url);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error(`❌ Geoapify API error: ${response.status} ${response.statusText}`, errorData);
      return null;
    }

    const data = await response.json();
    
    // Verify we have data
    if (!data.features || data.features.length === 0) {
      console.error('❌ No place details found for ID:', placeId);
      return null;
    }
    
    // Log the full place data for debugging
    console.log('Place details data:', JSON.stringify(data.features[0].properties, null, 2));
    
    const place = data.features[0].properties;
    const coordinates = data.features[0].geometry.coordinates;

    // Map the data to our internal structure
    const result = {
      formattedAddress: place.formatted || '',
      geometry: {
        location: {
          lat: coordinates[1], // GeoJSON format is [longitude, latitude]
          lng: coordinates[0],
        },
      },
      name: place.name || place.street || place.city || 'Unknown Place',
      placeId: place.place_id,
      // Additional useful properties
      countryCode: place.country_code,
      country: place.country,
      city: place.city,
      postcode: place.postcode,
      lat: coordinates[1],
      lng: coordinates[0],
      photos: place.images && place.images.length > 0 ? [
        { url: place.images[0], attribution: '© Geoapify' }
      ] : undefined,
      website: place.website,
      phoneNumber: place.contact?.phone,
      rating: place.rating,
      types: place.categories || []
    };
    
    return result;
  } catch (error) {
    console.error('Error getting place details from Geoapify:', error);
    return null;
  }
};

// Ensure a default return in case of unexpected errors
