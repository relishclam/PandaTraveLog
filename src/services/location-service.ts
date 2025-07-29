/**
 * Location Detection Service
 * Provides user location detection, geocoding, and travel routing context
 */

export interface LocationData {
  latitude: number;
  longitude: number;
  city: string;
  country: string;
  countryCode: string;
  region?: string;
  timezone: string;
  accuracy?: number;
  timestamp: number;
}

export interface TravelRoute {
  origin: LocationData;
  destination: LocationData;
  distance: number;
  estimatedTravelTime: string;
  transportModes: string[];
}

export interface GeocodingResult {
  latitude: number;
  longitude: number;
  city: string;
  country: string;
  countryCode: string;
  region?: string;
  formattedAddress: string;
}

export class LocationService {
  private static readonly GEOAPIFY_API_KEY = process.env.NEXT_PUBLIC_GEOAPIFY_API_KEY;
  private static readonly CACHE_DURATION = 1800000; // 30 minutes in milliseconds
  private static locationCache = new Map<string, { data: LocationData; timestamp: number }>();
  private static geocodingCache = new Map<string, { data: GeocodingResult; timestamp: number }>();

  /**
   * Get user's current location using browser geolocation API
   */
  static async getCurrentLocation(): Promise<LocationData> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by this browser'));
        return;
      }

      const options = {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000 // 5 minutes
      };

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const { latitude, longitude, accuracy } = position.coords;
            
            // Reverse geocode to get location details
            const locationDetails = await this.reverseGeocode(latitude, longitude);
            
            const locationData: LocationData = {
              latitude,
              longitude,
              city: locationDetails.city,
              country: locationDetails.country,
              countryCode: locationDetails.countryCode,
              region: locationDetails.region,
              timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
              accuracy,
              timestamp: Date.now()
            };

            resolve(locationData);
          } catch (error) {
            reject(new Error(`Failed to get location details: ${error}`));
          }
        },
        (error) => {
          let errorMessage = 'Unknown location error';
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = 'Location access denied by user';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = 'Location information unavailable';
              break;
            case error.TIMEOUT:
              errorMessage = 'Location request timed out';
              break;
          }
          reject(new Error(errorMessage));
        },
        options
      );
    });
  }

  /**
   * Get location from IP address as fallback
   */
  static async getLocationFromIP(): Promise<LocationData> {
    try {
      // Use ipapi.co for IP-based location (free tier: 1000 requests/day)
      const response = await fetch('https://ipapi.co/json/');
      
      if (!response.ok) {
        throw new Error(`IP location API error: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(`IP location error: ${data.reason}`);
      }

      return {
        latitude: data.latitude,
        longitude: data.longitude,
        city: data.city,
        country: data.country_name,
        countryCode: data.country_code,
        region: data.region,
        timezone: data.timezone,
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('IP location detection failed:', error);
      
      // Ultimate fallback to a default location (e.g., New York)
      return {
        latitude: 40.7128,
        longitude: -74.0060,
        city: 'New York',
        country: 'United States',
        countryCode: 'US',
        region: 'New York',
        timezone: 'America/New_York',
        timestamp: Date.now()
      };
    }
  }

  /**
   * Get user location with fallback strategy
   */
  static async getUserLocation(): Promise<LocationData> {
    try {
      // Try browser geolocation first
      return await this.getCurrentLocation();
    } catch (error) {
      console.warn('Browser geolocation failed, falling back to IP location:', error);
      
      try {
        // Fallback to IP-based location
        return await this.getLocationFromIP();
      } catch (ipError) {
        console.error('IP location also failed:', ipError);
        throw new Error('Unable to determine user location');
      }
    }
  }

  /**
   * Geocode an address or place name to coordinates
   */
  static async geocodeAddress(address: string): Promise<GeocodingResult> {
    const defaultResult: GeocodingResult = {
      latitude: 0,
      longitude: 0,
      city: '',
      country: '',
      countryCode: '',
      region: '',
      formattedAddress: 'Unknown Location'
    };

    try {
      const cacheKey = address.toLowerCase().trim();
      const cached = this.geocodingCache.get(cacheKey);
    
    // Return cached result if still valid
    if (cached && (Date.now() - cached.timestamp) < this.CACHE_DURATION) {
      return cached.data;
    }

    try {
      if (!this.GEOAPIFY_API_KEY) {
        throw new Error('Geoapify API key not configured');
      }

      const encodedAddress = encodeURIComponent(address);
      
      // Retry logic for geocoding API calls
      const MAX_RETRIES = 3;
      let attempt = 0;

      while (attempt < MAX_RETRIES) {
        try {
          const response = await fetch(
            `https://api.geoapify.com/v1/geocode/search?text=${encodedAddress}&apiKey=${this.GEOAPIFY_API_KEY}`
          );

          if (!response.ok) {
            throw new Error(`Geocoding API error: ${response.status}`);
          }

          const data = await response.json();

          if (!data.features || data.features.length === 0) {
            throw new Error(`No results found for address: ${address}`);
          }

          const feature = data.features[0];
          const properties = feature.properties;
          const coordinates = feature.geometry.coordinates;

          const result: GeocodingResult = {
            latitude: coordinates[1],
            longitude: coordinates[0],
            city: properties.city || properties.town || properties.village || '',
            country: properties.country || '',
            countryCode: properties.country_code?.toUpperCase() || '',
            region: properties.state || properties.region || '',
            formattedAddress: properties.formatted || address
          };

          // Cache the result
          this.geocodingCache.set(cacheKey, { data: result, timestamp: Date.now() });

          return result;
        } catch (error) {
          attempt++;
          console.warn(`Retrying geocoding API call (${attempt}/${MAX_RETRIES})`, error);
          if (attempt === MAX_RETRIES) {
            throw new Error(`Failed to geocode address: ${address} after maximum retries`);
          }
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
      }
      
      // Return default result if we reach this point (though we should never get here)
      return defaultResult;
    } catch (error) {
      console.error('Geocoding failed:', error);
      return defaultResult; // Return default result instead of throwing
    }
  }

  /**
   * Reverse geocode coordinates to address
   */
  static async reverseGeocode(latitude: number, longitude: number): Promise<GeocodingResult> {
    const cacheKey = `${latitude.toFixed(4)},${longitude.toFixed(4)}`;
    const cached = this.geocodingCache.get(cacheKey);
    
    // Return cached result if still valid
    if (cached && (Date.now() - cached.timestamp) < this.CACHE_DURATION) {
      return cached.data;
    }

    try {
      if (!this.GEOAPIFY_API_KEY) {
        throw new Error('Geoapify API key not configured');
      }

      const response = await fetch(
        `https://api.geoapify.com/v1/geocode/reverse?lat=${latitude}&lon=${longitude}&apiKey=${this.GEOAPIFY_API_KEY}`
      );

      if (!response.ok) {
        throw new Error(`Reverse geocoding API error: ${response.status}`);
      }

      const data = await response.json();

      if (!data.features || data.features.length === 0) {
        throw new Error(`No results found for coordinates: ${latitude}, ${longitude}`);
      }

      const feature = data.features[0];
      const properties = feature.properties;

      const result: GeocodingResult = {
        latitude,
        longitude,
        city: properties.city || properties.town || properties.village || '',
        country: properties.country || '',
        countryCode: properties.country_code?.toUpperCase() || '',
        region: properties.state || properties.region || '',
        formattedAddress: properties.formatted || `${latitude}, ${longitude}`
      };

      // Cache the result
      this.geocodingCache.set(cacheKey, { data: result, timestamp: Date.now() });

      return result;
    } catch (error) {
      console.error('Reverse geocoding failed:', error);
      throw new Error(`Failed to reverse geocode coordinates: ${latitude}, ${longitude}`);
    } finally {
      // Optional cleanup or logging can be added here if needed
    }
  }

  /**
   * Calculate travel route between two locations
   */
  static async calculateTravelRoute(
    origin: string | { lat: number; lng: number },
    destination: string | { lat: number; lng: number }
  ): Promise<TravelRoute> {
    try {
      let originData: GeocodingResult;
      let destinationData: GeocodingResult;

      // Geocode origin if it's a string
      if (typeof origin === 'string') {
        originData = await this.geocodeAddress(origin);
      } else {
        originData = await this.reverseGeocode(origin.lat, origin.lng);
      }

      // Geocode destination if it's a string
      if (typeof destination === 'string') {
        destinationData = await this.geocodeAddress(destination);
      } else {
        destinationData = await this.reverseGeocode(destination.lat, destination.lng);
      }

      // Calculate distance using Haversine formula
      const distance = this.calculateDistance(
        originData.latitude,
        originData.longitude,
        destinationData.latitude,
        destinationData.longitude
      );

      // Estimate travel time and suggest transport modes
      const { estimatedTravelTime, transportModes } = this.estimateTravelTime(distance);

      return {
        origin: {
          ...originData,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          timestamp: Date.now()
        },
        destination: {
          ...destinationData,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          timestamp: Date.now()
        },
        distance,
        estimatedTravelTime,
        transportModes
      };
    } catch (error) {
      console.error('Travel route calculation failed:', error);
      throw new Error(`Failed to calculate travel route: ${error}`);
    }
  }

  /**
   * Calculate distance between two points using Haversine formula
   */
  private static calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in kilometers
  }

  /**
   * Convert degrees to radians
   */
  private static toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Estimate travel time and suggest transport modes based on distance
   */
  private static estimateTravelTime(distanceKm: number): { estimatedTravelTime: string; transportModes: string[] } {
    const transportModes: string[] = [];
    let estimatedTravelTime = '';

    if (distanceKm < 5) {
      // Short distance - walking, cycling, car
      transportModes.push('Walking', 'Cycling', 'Car', 'Public Transport');
      estimatedTravelTime = '15-30 minutes by car';
    } else if (distanceKm < 50) {
      // Medium distance - car, public transport
      transportModes.push('Car', 'Public Transport', 'Taxi');
      const hours = Math.round(distanceKm / 50); // Rough estimate
      estimatedTravelTime = `${hours}-${hours + 1} hours by car`;
    } else if (distanceKm < 500) {
      // Long distance - car, train, bus
      transportModes.push('Car', 'Train', 'Bus');
      const hours = Math.round(distanceKm / 80); // Rough estimate for highway driving
      estimatedTravelTime = `${hours}-${hours + 2} hours by car/train`;
    } else {
      // Very long distance - flight, train
      transportModes.push('Flight', 'Train');
      const flightHours = Math.round(distanceKm / 800); // Rough estimate for flight
      estimatedTravelTime = `${flightHours}-${flightHours + 2} hours by flight`;
    }

    return { estimatedTravelTime, transportModes };
  }

  /**
   * Get timezone for a location
   */
  static async getTimezone(latitude: number, longitude: number): Promise<string> {
    try {
      if (!this.GEOAPIFY_API_KEY) {
        return Intl.DateTimeFormat().resolvedOptions().timeZone;
      }

      const response = await fetch(
        `https://api.geoapify.com/v1/geocode/reverse?lat=${latitude}&lon=${longitude}&apiKey=${this.GEOAPIFY_API_KEY}`
      );

      if (!response.ok) {
        throw new Error(`Timezone API error: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.features && data.features.length > 0) {
        return data.features[0].properties.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
      }

      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch (error) {
      console.error('Timezone detection failed:', error);
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    }
  }

  /**
   * Check if user has granted location permission
   */
  static async checkLocationPermission(): Promise<'granted' | 'denied' | 'prompt' | 'unsupported'> {
    if (!navigator.geolocation) {
      return 'unsupported';
    }

    if (!navigator.permissions) {
      return 'prompt'; // Assume we need to prompt
    }

    try {
      const permission = await navigator.permissions.query({ name: 'geolocation' });
      return permission.state;
    } catch (error) {
      return 'prompt';
    }
  }

  /**
   * Format location for display
   */
  static formatLocation(location: LocationData | GeocodingResult): string {
    const parts = [];
    
    if (location.city) parts.push(location.city);
    if (location.region && location.region !== location.city) parts.push(location.region);
    if (location.country) parts.push(location.country);
    
    return parts.join(', ') || 'Unknown Location';
  }
}
