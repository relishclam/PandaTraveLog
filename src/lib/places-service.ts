import { initGoogleMapsLoader } from './google-maps-loader';

// Importing Google Maps types
declare global {
  interface Window {
    google: any;
  }
}

export type PlaceSuggestion = {
  placeId: string;
  description: string;
  mainText: string;
  secondaryText: string;
  types: string[];
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

// Using the new Google Maps Places API
let placesClient: any = null; // google.maps.places.Place
let autocompleteClient: any = null; // google.maps.places.AutocompleteSuggestion

const initServices = async () => {
  await initGoogleMapsLoader();
  
  if (!autocompleteClient) {
    // Using the new AutocompleteSuggestion API
    autocompleteClient = new google.maps.places.AutocompleteSuggestion();
  }
  
  if (!placesClient) {
    // Using the new Place API
    placesClient = new google.maps.places.Place();
  }
};

export const getPlaceSuggestions = async (
  input: string
): Promise<PlaceSuggestion[]> => {
  if (!input || input.trim().length < 2) {
    return [];
  }
  
  try {
    await initServices();
    
    // New API uses a different request format
    const request = {
      input: input.trim()
    };
    
    // Using the new API with Promise-based approach
    try {
      const response = await autocompleteClient.getAutocompleteSuggestions(request);
      
      if (response && response.suggestions) {
        const suggestions: PlaceSuggestion[] = response.suggestions.map(suggestion => ({
          placeId: suggestion.placeId,
          description: suggestion.formattedText || suggestion.text || '',
          mainText: suggestion.primaryText || suggestion.formattedText || '',
          secondaryText: suggestion.secondaryText || '',
          types: suggestion.types || []
        }));
        return suggestions;
      }
      return [];
    } catch (error) {
      console.error('Error getting place suggestions:', error);
      return [];
    }
  } catch (error) {
    console.error('Error initializing services:', error);
    return [];
  }
};

export const getPlaceDetails = async (
  placeId: string
): Promise<PlaceDetails | null> => {
  try {
    await initServices();
    
    // New API uses a different request format
    const request = {
      placeId,
      fields: [
        'displayName', 
        'formattedAddress', 
        'location', 
        'photos', 
        'websiteURI', 
        'internationalPhoneNumber', 
        'rating', 
        'types'
      ]
    };
    
    try {
      // Using the new API with Promise-based approach
      const response = await placesClient.fetchPlace(request);
      
      if (response && response.place) {
        const place = response.place;
        
        // Process photos if available
        const photos = place.photos?.map(photo => ({
          url: photo.name || '', // The new API handles photo URLs differently
          attribution: photo.attributions?.join(' ') || ''
        })) || undefined;
        
        const details: PlaceDetails = {
          placeId,
          name: place.displayName?.text || '',
          formattedAddress: place.formattedAddress || '',
          location: {
            lat: place.location?.latitude || 0,
            lng: place.location?.longitude || 0,
          },
          photos,
          website: place.websiteURI,
          phoneNumber: place.internationalPhoneNumber,
          rating: place.rating,
          types: place.types || []
        };
        
        return details;
      }
      
      return null;
    } catch (error) {
      console.error('Error fetching place details:', error);
      return null;
    }
  } catch (error) {
    console.error('Error initializing services:', error);
    return null;
  }
};
