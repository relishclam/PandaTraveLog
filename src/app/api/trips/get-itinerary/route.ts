export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { itineraryService } from '@/services/itinerary-service';
import supabase from '@/lib/supabase';

export async function GET(request: Request) {
  try {
    // Extract tripId from query parameters
    const url = new URL(request.url);
    const tripId = url.searchParams.get('tripId');
    
    if (!tripId) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameter: tripId' },
        { status: 400 }
      );
    }
    
    // Get itinerary with all details
    const itinerary = await itineraryService.getItinerary(tripId);
    
    if (!itinerary) {
      return NextResponse.json(
        { success: false, error: 'Itinerary not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      itinerary
    });
  } catch (error: any) {
    console.error('Error in get-itinerary API route:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to get itinerary' },
      { status: 500 }
    );
  }
}
