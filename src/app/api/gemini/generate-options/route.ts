import { NextResponse } from 'next/server';
import { geminiService, TripDetails } from '@/services/gemini-service';

export async function POST(request: Request) {
  try {
    console.log('API route /api/gemini/generate-options called');
    const body = await request.json();
    const { tripDetails } = body as { tripDetails: TripDetails };
    
    // Validate required fields
    if (!tripDetails || !tripDetails.title || !tripDetails.startDate || !tripDetails.endDate || !tripDetails.mainDestination) {
      console.error('Missing required trip details:', tripDetails);
      return NextResponse.json(
        { success: false, error: 'Missing required trip details' },
        { status: 400 }
      );
    }

    console.log('Trip details validated, calling Gemini service');
    console.log('API key check:', process.env.GEMINI_API_KEY ? 'Server-side key available' : 'No server-side key', 
               process.env.NEXT_PUBLIC_GEMINI_API_KEY ? 'Client-side key available' : 'No client-side key');
    
    // Call Gemini service to generate itinerary options
    const response = await geminiService.generateItineraryOptions(tripDetails);
    console.log('Gemini service response:', response.success ? 'Success' : 'Failed', 
               response.error || '', 
               response.itineraryOptions ? `Got ${response.itineraryOptions.length} options` : 'No options');
    
    return NextResponse.json(response);
  } catch (error: any) {
    console.error('Error in generate-options API route:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to generate itinerary options' 
      },
      { status: 500 }
    );
  }
}
