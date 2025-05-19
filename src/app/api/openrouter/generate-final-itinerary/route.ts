import { NextResponse } from 'next/server';
import { openRouterService, TripDetails, ActivityOption } from '@/services/openrouter-service';

export async function POST(request: Request) {
  try {
    console.log('API route /api/openrouter/generate-final-itinerary called');
    const body = await request.json();
    const { tripDetails, selectedActivities } = body as { 
      tripDetails: TripDetails;
      selectedActivities: ActivityOption[];
    };
    
    // Validate required fields
    if (!tripDetails || !tripDetails.title || !tripDetails.startDate || !tripDetails.endDate || !tripDetails.mainDestination) {
      console.error('Missing required trip details:', tripDetails);
      return NextResponse.json(
        { success: false, error: 'Missing required trip details' },
        { status: 400 }
      );
    }
    
    if (!selectedActivities || !Array.isArray(selectedActivities) || selectedActivities.length === 0) {
      console.error('No activities selected');
      return NextResponse.json(
        { success: false, error: 'No activities selected' },
        { status: 400 }
      );
    }
    
    console.log(`Processing final itinerary request with ${selectedActivities.length} selected activities`);
    
    // Check for OpenRouter API key
    const apiKey = process.env.OPEN_ROUTER_API_KEY || process.env.NEXT_PUBLIC_OPEN_ROUTER_API_KEY;
    console.log('OPEN_ROUTER_API_KEY available:', !!process.env.OPEN_ROUTER_API_KEY);
    console.log('NEXT_PUBLIC_OPEN_ROUTER_API_KEY available:', !!process.env.NEXT_PUBLIC_OPEN_ROUTER_API_KEY);
    console.log('Combined API key available:', !!apiKey, apiKey ? `(length: ${apiKey.length})` : '');
    
    if (!apiKey) {
      console.error('OpenRouter API key missing in server environment');
      return NextResponse.json(
        { success: false, error: 'API key is missing on server' },
        { status: 500 }
      );
    }
    
    // Call service to generate final itinerary with explicit API key
    const response = await openRouterService.generateFinalItinerary(tripDetails, selectedActivities, apiKey);
    console.log('OpenRouter service response:', response.success ? 'Success' : 'Failed', 
                response.error || '', 
                response.finalItinerary ? 'Got final itinerary' : 'No final itinerary');
    
    // If successful and a finalItinerary was generated, offer to save it
    if (response.success && response.finalItinerary) {
      response.canSaveItinerary = true;
    }
    
    return NextResponse.json(response);
  } catch (error: any) {
    console.error('Error in generate-final-itinerary API route:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to generate final itinerary' 
      },
      { status: 500 }
    );
  }
}
