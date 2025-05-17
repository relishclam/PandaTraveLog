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
  
  const apiKey = process.env.NEXT_PUBLIC_GEOAPIFY_API_KEY;
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
  if (!input || input.trim().length < 2) {
    return [];
  }

  try {
    const apiKey = process.env.NEXT_PUBLIC_GEOAPIFY_API_KEY;
    let url = `https://api.geoapify.com/v1/geocode/autocomplete?text=${encodeURIComponent(input.trim())}&apiKey=${apiKey}`;
    // Optionally restrict to country
    if (options?.country) {
      url += `&filter=countrycode:${options.country.toLowerCase()}`;
    }

    // Add city-only filter if requested
    if (options?.restrictToCities) {
      url += "&type=city";
    }
    
    console.log("API URL being called:", url);
    
    const res = await fetch(url);
    const data = await res.json();
    return (data.features || []).map((feature: any) => ({
      placeId: feature.properties.place_id,
      description: feature.properties.formatted,
      mainText: feature.properties.city || feature.properties.name || feature.properties.state,
      secondaryText: feature.properties.country || feature.properties.state,
      types: [feature.properties.result_type],
      lat: feature.geometry.coordinates[1],
      lng: feature.geometry.coordinates[0],
    }));
  } catch (error) {
    console.error('Error getting place suggestions from Geoapify:', error);
    return [];
  }
};

export const getPlaceDetails = async (
  placeId: string
): Promise<PlaceDetails | null> => {
  try {
    const apiKey = process.env.NEXT_PUBLIC_GEOAPIFY_API_KEY;
    const url = `https://api.geoapify.com/v2/place-details?id=${placeId}&apiKey=${apiKey}`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (!data.features || data.features.length === 0) {
      return null;
    }
    
    const place = data.features[0];
    const props = place.properties;
    
    // Create a standardized photo object if available
    const photos = props.images && props.images.length > 0 
      ? [{
          url: props.images[0],
          attribution: `© Geoapify and data providers`
        }]
      : undefined;
    
    const details: PlaceDetails = {
      placeId,
      name: props.name || props.formatted,
      formattedAddress: props.formatted,
      location: {
        lat: place.geometry.coordinates[1],
        lng: place.geometry.coordinates[0],
      },
      lat: place.geometry.coordinates[1],
      lng: place.geometry.coordinates[0],
      photos,
      website: props.website,
      phoneNumber: props.contact && props.contact.phone,
      rating: props.rating,
      types: props.categories || []
    };
    
    return details;
  } catch (error) {
    console.error('Error getting place details from Geoapify:', error);
    return null;
  }
};
