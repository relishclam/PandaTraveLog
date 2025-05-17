import { initGoogleMapsLoader } from './google-maps-loader';

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

let placesService: google.maps.places.PlacesService | null = null;
let autocompleteService: google.maps.places.AutocompleteService | null = null;

const initServices = async () => {
  await initGoogleMapsLoader();
  
  if (!autocompleteService) {
    autocompleteService = new google.maps.places.AutocompleteService();
  }
  
  if (!placesService) {
    // Create a dummy element for PlacesService
    const dummyElement = document.createElement('div');
    placesService = new google.maps.places.PlacesService(dummyElement);
  }
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
    await initServices();
    
    const request: google.maps.places.PlaceDetailsRequest = {
      placeId,
      fields: [
        'name', 
        'formatted_address', 
        'geometry', 
        'photos', 
        'website', 
        'formatted_phone_number', 
        'rating', 
        'types'
      ]
    };
    
    return new Promise((resolve, reject) => {
      placesService!.getDetails(request, (place, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && place) {
          const photos = place.photos?.map(photo => ({
            url: photo.getUrl({ maxWidth: 400, maxHeight: 400 }),
            attribution: photo.html_attributions.join(' ')
          }));
          
          const details: PlaceDetails = {
            placeId,
            name: place.name || '',
            formattedAddress: place.formatted_address || '',
            location: {
              lat: place.geometry?.location?.lat() || 0,
              lng: place.geometry?.location?.lng() || 0,
            },
            photos,
            website: place.website,
            phoneNumber: place.formatted_phone_number,
            rating: place.rating,
            types: place.types || []
          };
          
          resolve(details);
        } else {
          resolve(null);
        }
      });
    });
  } catch (error) {
    console.error('Error getting place details:', error);
    return null;
  }
};
