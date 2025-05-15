import { Loader } from '@googlemaps/js-api-loader';

let loader: Loader | null = null;
let loadPromise: Promise<void> | null = null;

export const initGoogleMapsLoader = () => {
  if (!loader) {
    loader = new Loader({
      apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
      version: 'weekly',
      libraries: ['places']
    });
  }
  
  if (!loadPromise) {
    loadPromise = loader.load().catch(error => {
      console.error('Error loading Google Maps API:', error);
      loadPromise = null;
      throw error;
    });
  }
  
  return loadPromise;
};
