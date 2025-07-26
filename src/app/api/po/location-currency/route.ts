import { NextRequest, NextResponse } from 'next/server';
import { LocationService } from '@/services/location-service';
import { CurrencyService } from '@/services/currency-service';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    switch (action) {
      case 'location':
        return await handleGetLocation(searchParams);
      case 'currency-info':
        return await handleGetCurrencyInfo(searchParams);
      case 'convert':
        return await handleCurrencyConversion(searchParams);
      case 'geocode':
        return await handleGeocode(searchParams);
      case 'travel-route':
        return await handleTravelRoute(searchParams);
      default:
        return NextResponse.json(
          { error: 'Invalid action. Supported actions: location, currency-info, convert, geocode, travel-route' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Location/Currency API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function handleGetLocation(searchParams: URLSearchParams) {
  try {
    const method = searchParams.get('method') || 'auto';
    let location;

    switch (method) {
      case 'ip':
        location = await LocationService.getLocationFromIP();
        break;
      case 'auto':
      default:
        location = await LocationService.getUserLocation();
        break;
    }

    const currency = CurrencyService.detectCurrencyFromLocation(location.countryCode);
    const currencyInfo = CurrencyService.getCurrencyInfo(currency);

    return NextResponse.json({
      location,
      suggestedCurrency: {
        code: currency,
        info: currencyInfo
      }
    });
  } catch (error) {
    console.error('Location detection error:', error);
    return NextResponse.json(
      { error: `Failed to get location: ${error}` },
      { status: 500 }
    );
  }
}

async function handleGetCurrencyInfo(searchParams: URLSearchParams) {
  try {
    const code = searchParams.get('code');
    const region = searchParams.get('region');

    if (code) {
      const currencyInfo = CurrencyService.getCurrencyInfo(code);
      if (!currencyInfo) {
        return NextResponse.json(
          { error: `Currency not found: ${code}` },
          { status: 404 }
        );
      }
      return NextResponse.json({ currency: currencyInfo });
    }

    if (region) {
      const currencies = CurrencyService.getCurrenciesForRegion(region);
      return NextResponse.json({ currencies });
    }

    // Return all supported currencies
    return NextResponse.json({ 
      currencies: CurrencyService.SUPPORTED_CURRENCIES 
    });
  } catch (error) {
    console.error('Currency info error:', error);
    return NextResponse.json(
      { error: `Failed to get currency info: ${error}` },
      { status: 500 }
    );
  }
}

async function handleCurrencyConversion(searchParams: URLSearchParams) {
  try {
    const amount = parseFloat(searchParams.get('amount') || '0');
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    if (!from || !to) {
      return NextResponse.json(
        { error: 'Missing required parameters: from, to' },
        { status: 400 }
      );
    }

    if (amount <= 0) {
      return NextResponse.json(
        { error: 'Amount must be greater than 0' },
        { status: 400 }
      );
    }

    const conversion = await CurrencyService.convertCurrency(amount, from, to);
    const formattedOriginal = CurrencyService.formatCurrency(amount, from);
    const formattedConverted = CurrencyService.formatCurrency(conversion.convertedAmount, to);

    return NextResponse.json({
      conversion,
      formatted: {
        original: formattedOriginal,
        converted: formattedConverted
      }
    });
  } catch (error) {
    console.error('Currency conversion error:', error);
    return NextResponse.json(
      { error: `Failed to convert currency: ${error}` },
      { status: 500 }
    );
  }
}

async function handleGeocode(searchParams: URLSearchParams) {
  try {
    const address = searchParams.get('address');
    const lat = searchParams.get('lat');
    const lng = searchParams.get('lng');

    if (address) {
      // Forward geocoding
      const result = await LocationService.geocodeAddress(address);
      return NextResponse.json({ result });
    }

    if (lat && lng) {
      // Reverse geocoding
      const latitude = parseFloat(lat);
      const longitude = parseFloat(lng);
      
      if (isNaN(latitude) || isNaN(longitude)) {
        return NextResponse.json(
          { error: 'Invalid coordinates' },
          { status: 400 }
        );
      }

      const result = await LocationService.reverseGeocode(latitude, longitude);
      return NextResponse.json({ result });
    }

    return NextResponse.json(
      { error: 'Missing required parameters: address OR (lat AND lng)' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Geocoding error:', error);
    return NextResponse.json(
      { error: `Failed to geocode: ${error}` },
      { status: 500 }
    );
  }
}

async function handleTravelRoute(searchParams: URLSearchParams) {
  try {
    const origin = searchParams.get('origin');
    const destination = searchParams.get('destination');
    const originLat = searchParams.get('origin_lat');
    const originLng = searchParams.get('origin_lng');
    const destLat = searchParams.get('dest_lat');
    const destLng = searchParams.get('dest_lng');

    if (!origin && !destination && (!originLat || !originLng || !destLat || !destLng)) {
      return NextResponse.json(
        { error: 'Missing required parameters: (origin AND destination) OR (origin_lat, origin_lng, dest_lat, dest_lng)' },
        { status: 400 }
      );
    }

    let originData: string | { lat: number; lng: number };
    let destinationData: string | { lat: number; lng: number };

    if (origin && destination) {
      originData = origin;
      destinationData = destination;
    } else {
      originData = { lat: parseFloat(originLat!), lng: parseFloat(originLng!) };
      destinationData = { lat: parseFloat(destLat!), lng: parseFloat(destLng!) };
    }

    const route = await LocationService.calculateTravelRoute(originData, destinationData);
    
    // Add formatted location strings
    const formattedRoute = {
      ...route,
      formatted: {
        origin: LocationService.formatLocation(route.origin),
        destination: LocationService.formatLocation(route.destination),
        distance: `${route.distance.toFixed(1)} km`,
        transportModes: route.transportModes.join(', ')
      }
    };

    return NextResponse.json({ route: formattedRoute });
  } catch (error) {
    console.error('Travel route error:', error);
    return NextResponse.json(
      { error: `Failed to calculate travel route: ${error}` },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    switch (action) {
      case 'batch-convert':
        return await handleBatchConversion(body);
      case 'location-permission':
        return await handleLocationPermission();
      default:
        return NextResponse.json(
          { error: 'Invalid action. Supported actions: batch-convert, location-permission' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Location/Currency POST API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function handleBatchConversion(body: any) {
  try {
    const { conversions } = body;
    
    if (!Array.isArray(conversions)) {
      return NextResponse.json(
        { error: 'conversions must be an array' },
        { status: 400 }
      );
    }

    const results = await Promise.allSettled(
      conversions.map(async (conv: any) => {
        const { amount, from, to } = conv;
        const conversion = await CurrencyService.convertCurrency(amount, from, to);
        return {
          ...conversion,
          formatted: {
            original: CurrencyService.formatCurrency(amount, from),
            converted: CurrencyService.formatCurrency(conversion.convertedAmount, to)
          }
        };
      })
    );

    const successful = results
      .filter((result): result is PromiseFulfilledResult<any> => result.status === 'fulfilled')
      .map(result => result.value);

    const failed = results
      .filter((result): result is PromiseRejectedResult => result.status === 'rejected')
      .map(result => result.reason);

    return NextResponse.json({
      successful,
      failed: failed.length > 0 ? failed : undefined,
      total: conversions.length,
      successCount: successful.length,
      failureCount: failed.length
    });
  } catch (error) {
    console.error('Batch conversion error:', error);
    return NextResponse.json(
      { error: `Failed to perform batch conversion: ${error}` },
      { status: 500 }
    );
  }
}

async function handleLocationPermission() {
  try {
    // This is a server-side endpoint, but location permission is client-side
    // Return instructions for client-side permission checking
    return NextResponse.json({
      message: 'Location permission must be checked on the client side',
      instructions: {
        method: 'LocationService.checkLocationPermission()',
        possibleValues: ['granted', 'denied', 'prompt', 'unsupported']
      }
    });
  } catch (error) {
    console.error('Location permission error:', error);
    return NextResponse.json(
      { error: `Failed to check location permission: ${error}` },
      { status: 500 }
    );
  }
}
