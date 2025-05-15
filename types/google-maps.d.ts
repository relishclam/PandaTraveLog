declare namespace google {
  namespace maps {
    class Map {
      constructor(element: HTMLElement, options: any);
      setCenter(center: { lat: number; lng: number }): void;
      setZoom(zoom: number): void;
      addListener(event: string, handler: Function): any;
    }
    
    class Marker {
      constructor(options: any);
      setMap(map: Map | null): void;
    }
    
    interface MapMouseEvent {
      latLng?: { lat(): number; lng(): number };
    }
    
    namespace event {
      function clearListeners(instance: any, eventName: string): void;
    }
    
    enum Animation {
      DROP = 1
    }
    
    enum SymbolPath {
      CIRCLE = 0
    }

    // Places API types
    namespace places {
      class PlacesService {
        constructor(attrContainer: HTMLElement);
        getDetails(request: PlaceDetailsRequest, callback: (result: PlaceResult | null, status: PlacesServiceStatus) => void): void;
      }

      class AutocompleteService {
        constructor();
        getPlacePredictions(request: AutocompletionRequest, callback: (predictions: AutocompletePrediction[] | null, status: PlacesServiceStatus) => void): void;
      }

      interface AutocompletionRequest {
        input: string;
        bounds?: LatLngBounds;
        componentRestrictions?: ComponentRestrictions;
        types?: string[];
      }

      interface AutocompletePrediction {
        place_id: string;
        description: string;
        structured_formatting?: {
          main_text: string;
          secondary_text: string;
        };
        types?: string[];
      }

      interface PlaceDetailsRequest {
        placeId: string;
        fields?: string[];
      }

      interface PlaceResult {
        place_id?: string;
        name?: string;
        formatted_address?: string;
        geometry?: {
          location?: {
            lat(): number;
            lng(): number;
          };
        };
        photos?: {
          getUrl(options: { maxWidth: number; maxHeight: number }): string;
          html_attributions: string[];
        }[];
        website?: string;
        formatted_phone_number?: string;
        rating?: number;
        types?: string[];
      }

      enum PlacesServiceStatus {
        OK = 'OK',
        ZERO_RESULTS = 'ZERO_RESULTS',
        OVER_QUERY_LIMIT = 'OVER_QUERY_LIMIT',
        REQUEST_DENIED = 'REQUEST_DENIED',
        INVALID_REQUEST = 'INVALID_REQUEST',
        UNKNOWN_ERROR = 'UNKNOWN_ERROR'
      }

      interface ComponentRestrictions {
        country: string | string[];
      }
    }

    interface LatLngBounds {
      northeast: { lat: number; lng: number };
      southwest: { lat: number; lng: number };
    }
  }
}