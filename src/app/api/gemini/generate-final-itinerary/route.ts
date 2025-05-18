import { NextResponse } from 'next/server';
import { geminiService, TripDetails, ActivityOption } from '@/services/gemini-service';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { tripDetails, selectedActivities } = body as { 
      tripDetails: TripDetails, 
      selectedActivities: ActivityOption[] 
    };
    
    // Validate required fields
    if (!tripDetails || !tripDetails.title || !tripDetails.startDate || !tripDetails.endDate || !tripDetails.mainDestination) {
      return NextResponse.json(
        { success: false, error: 'Missing required trip details' },
        { status: 400 }
      );
    }
    
    if (!selectedActivities || !Array.isArray(selectedActivities) || selectedActivities.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No activities selected for the itinerary' },
        { status: 400 }
      );
    }
    
    // Call Gemini service to generate final itinerary
    const response = await geminiService.generateFinalItinerary(tripDetails, selectedActivities);
    
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
