import { initGoogleMapsLoader } from './google-maps-loader';

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

export const getPlaceSuggestions = async (
  input: string
): Promise<PlaceSuggestion[]> => {
  if (!input || input.trim().length < 2) {
    return [];
  }
  
  try {
    await initServices();
    
    const request: google.maps.places.AutocompletionRequest = {
      input: input.trim()
    };
    
    return new Promise((resolve, reject) => {
      autocompleteService!.getPlacePredictions(request, (predictions, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && predictions) {
          const suggestions: PlaceSuggestion[] = predictions.map(prediction => ({
            placeId: prediction.place_id,
            description: prediction.description,
            mainText: prediction.structured_formatting?.main_text || prediction.description,
            secondaryText: prediction.structured_formatting?.secondary_text || '',
            types: prediction.types || []
          }));
          resolve(suggestions);
        } else {
          resolve([]);
        }
      });
    });
  } catch (error) {
    console.error('Error getting place suggestions:', error);
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
