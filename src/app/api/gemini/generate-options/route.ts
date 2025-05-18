import { NextResponse } from 'next/server';
import { geminiService, TripDetails } from '@/services/gemini-service';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { tripDetails } = body as { tripDetails: TripDetails };
    
    // Validate required fields
    if (!tripDetails || !tripDetails.title || !tripDetails.startDate || !tripDetails.endDate || !tripDetails.mainDestination) {
      return NextResponse.json(
        { success: false, error: 'Missing required trip details' },
        { status: 400 }
      );
    }
    
    // Call Gemini service to generate itinerary options
    const response = await geminiService.generateItineraryOptions(tripDetails);
    
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
