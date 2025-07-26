import { useState, useEffect, useCallback } from 'react';
import { LocationService, LocationData, TravelRoute } from '@/services/location-service';
import { CurrencyService, CurrencyConversion, SupportedCurrency } from '@/services/currency-service';

export interface LocationCurrencyState {
  // Location data
  userLocation: LocationData | null;
  locationLoading: boolean;
  locationError: string | null;
  locationPermission: 'granted' | 'denied' | 'prompt' | 'unsupported' | null;
  
  // Currency data
  preferredCurrency: string;
  supportedCurrencies: SupportedCurrency[];
  currencyLoading: boolean;
  currencyError: string | null;
  
  // Conversion cache
  conversionCache: Map<string, CurrencyConversion>;
}

export interface UseLocationCurrencyReturn extends LocationCurrencyState {
  // Location functions
  getUserLocation: () => Promise<LocationData | null>;
  checkLocationPermission: () => Promise<void>;
  geocodeAddress: (address: string) => Promise<any>;
  calculateTravelRoute: (origin: string, destination: string) => Promise<TravelRoute | null>;
  
  // Currency functions
  convertCurrency: (amount: number, from: string, to: string) => Promise<CurrencyConversion | null>;
  formatCurrency: (amount: number, currencyCode: string) => string;
  setPreferredCurrency: (currency: string) => void;
  getCurrencyInfo: (code: string) => SupportedCurrency | null;
  
  // Utility functions
  formatLocation: (location: LocationData) => string;
  detectCurrencyFromLocation: (countryCode: string) => string;
}

export function useLocationCurrency(): UseLocationCurrencyReturn {
  const [state, setState] = useState<LocationCurrencyState>({
    userLocation: null,
    locationLoading: false,
    locationError: null,
    locationPermission: null,
    preferredCurrency: 'USD',
    supportedCurrencies: CurrencyService.SUPPORTED_CURRENCIES,
    currencyLoading: false,
    currencyError: null,
    conversionCache: new Map()
  });

  // Initialize location permission check on mount
  useEffect(() => {
    checkLocationPermission();
  }, []);

  // Auto-detect user location and preferred currency on mount
  useEffect(() => {
    const initializeLocation = async () => {
      try {
        const location = await getUserLocation();
        if (location) {
          const detectedCurrency = CurrencyService.detectCurrencyFromLocation(location.countryCode);
          setState(prev => ({
            ...prev,
            preferredCurrency: detectedCurrency
          }));
        }
      } catch (error) {
        console.warn('Failed to auto-detect location and currency:', error);
      }
    };

    initializeLocation();
  }, []);

  const getUserLocation = useCallback(async (): Promise<LocationData | null> => {
    setState(prev => ({ ...prev, locationLoading: true, locationError: null }));

    try {
      // Try client-side location detection first
      const location = await LocationService.getUserLocation();
      
      setState(prev => ({
        ...prev,
        userLocation: location,
        locationLoading: false
      }));

      return location;
    } catch (error) {
      // Fallback to server-side IP location
      try {
        const response = await fetch('/api/po/location-currency?action=location&method=ip');
        const data = await response.json();
        
        if (data.location) {
          setState(prev => ({
            ...prev,
            userLocation: data.location,
            locationLoading: false
          }));
          return data.location;
        }
      } catch (serverError) {
        console.error('Server location detection failed:', serverError);
      }

      setState(prev => ({
        ...prev,
        locationError: `Failed to get location: ${error}`,
        locationLoading: false
      }));
      return null;
    }
  }, []);

  const checkLocationPermission = useCallback(async (): Promise<void> => {
    try {
      const permission = await LocationService.checkLocationPermission();
      setState(prev => ({ ...prev, locationPermission: permission }));
    } catch (error) {
      console.error('Failed to check location permission:', error);
      setState(prev => ({ ...prev, locationPermission: 'unsupported' }));
    }
  }, []);

  const geocodeAddress = useCallback(async (address: string) => {
    try {
      const response = await fetch(`/api/po/location-currency?action=geocode&address=${encodeURIComponent(address)}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Geocoding failed');
      }
      
      return data.result;
    } catch (error) {
      console.error('Geocoding failed:', error);
      throw error;
    }
  }, []);

  const calculateTravelRoute = useCallback(async (origin: string, destination: string): Promise<TravelRoute | null> => {
    try {
      const response = await fetch(
        `/api/po/location-currency?action=travel-route&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}`
      );
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Travel route calculation failed');
      }
      
      return data.route;
    } catch (error) {
      console.error('Travel route calculation failed:', error);
      return null;
    }
  }, []);

  const convertCurrency = useCallback(async (
    amount: number, 
    from: string, 
    to: string
  ): Promise<CurrencyConversion | null> => {
    // Check cache first
    const cacheKey = `${amount}-${from}-${to}`;
    const cached = state.conversionCache.get(cacheKey);
    
    if (cached && (Date.now() - cached.timestamp) < 300000) { // 5 minutes cache
      return cached;
    }

    setState(prev => ({ ...prev, currencyLoading: true, currencyError: null }));

    try {
      const response = await fetch(
        `/api/po/location-currency?action=convert&amount=${amount}&from=${from}&to=${to}`
      );
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Currency conversion failed');
      }

      const conversion = data.conversion;
      
      // Update cache
      setState(prev => {
        const newCache = new Map(prev.conversionCache);
        newCache.set(cacheKey, conversion);
        return {
          ...prev,
          conversionCache: newCache,
          currencyLoading: false
        };
      });

      return conversion;
    } catch (error) {
      setState(prev => ({
        ...prev,
        currencyError: `Currency conversion failed: ${error}`,
        currencyLoading: false
      }));
      return null;
    }
  }, [state.conversionCache]);

  const formatCurrency = useCallback((amount: number, currencyCode: string): string => {
    return CurrencyService.formatCurrency(amount, currencyCode);
  }, []);

  const setPreferredCurrency = useCallback((currency: string) => {
    setState(prev => ({ ...prev, preferredCurrency: currency }));
    
    // Store in localStorage for persistence
    try {
      localStorage.setItem('pandatravelog_preferred_currency', currency);
    } catch (error) {
      console.warn('Failed to save preferred currency to localStorage:', error);
    }
  }, []);

  const getCurrencyInfo = useCallback((code: string): SupportedCurrency | null => {
    return CurrencyService.getCurrencyInfo(code);
  }, []);

  const formatLocation = useCallback((location: LocationData): string => {
    return LocationService.formatLocation(location);
  }, []);

  const detectCurrencyFromLocation = useCallback((countryCode: string): string => {
    return CurrencyService.detectCurrencyFromLocation(countryCode);
  }, []);

  // Load preferred currency from localStorage on mount
  useEffect(() => {
    try {
      const savedCurrency = localStorage.getItem('pandatravelog_preferred_currency');
      if (savedCurrency && CurrencyService.getCurrencyInfo(savedCurrency)) {
        setState(prev => ({ ...prev, preferredCurrency: savedCurrency }));
      }
    } catch (error) {
      console.warn('Failed to load preferred currency from localStorage:', error);
    }
  }, []);

  return {
    ...state,
    getUserLocation,
    checkLocationPermission,
    geocodeAddress,
    calculateTravelRoute,
    convertCurrency,
    formatCurrency,
    setPreferredCurrency,
    getCurrencyInfo,
    formatLocation,
    detectCurrencyFromLocation
  };
}

// Helper hook for currency conversion in components
export function useCurrencyConverter() {
  const { convertCurrency, formatCurrency, preferredCurrency, currencyLoading } = useLocationCurrency();

  const convertAndFormat = useCallback(async (
    amount: number, 
    fromCurrency: string, 
    toCurrency?: string
  ): Promise<string | null> => {
    const targetCurrency = toCurrency || preferredCurrency;
    
    if (fromCurrency === targetCurrency) {
      return formatCurrency(amount, fromCurrency);
    }

    const conversion = await convertCurrency(amount, fromCurrency, targetCurrency);
    if (conversion) {
      return formatCurrency(conversion.convertedAmount, targetCurrency);
    }
    
    return null;
  }, [convertCurrency, formatCurrency, preferredCurrency]);

  return {
    convertAndFormat,
    formatCurrency,
    preferredCurrency,
    loading: currencyLoading
  };
}

// Helper hook for location-based features
export function useLocationFeatures() {
  const { 
    userLocation, 
    locationLoading, 
    locationError,
    locationPermission,
    getUserLocation,
    checkLocationPermission,
    calculateTravelRoute,
    formatLocation
  } = useLocationCurrency();

  const getLocationString = useCallback((): string => {
    if (userLocation) {
      return formatLocation(userLocation);
    }
    return 'Location not detected';
  }, [userLocation, formatLocation]);

  const requestLocationAccess = useCallback(async (): Promise<boolean> => {
    await checkLocationPermission();
    const location = await getUserLocation();
    return location !== null;
  }, [checkLocationPermission, getUserLocation]);

  return {
    userLocation,
    locationLoading,
    locationError,
    locationPermission,
    getLocationString,
    requestLocationAccess,
    calculateTravelRoute,
    formatLocation
  };
}
