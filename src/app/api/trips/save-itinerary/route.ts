import { NextResponse } from 'next/server';
import { itineraryService } from '@/services/itinerary-service';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );
    const { tripId, itinerary, userId } = await request.json();

    // Validate required fields
    if (!tripId || !itinerary || !userId) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: tripId, itinerary, userId' },
        { status: 400 }
      );
    }

    // Validate itinerary structure
    if (!itinerary.title || !itinerary.days || !Array.isArray(itinerary.days) || itinerary.days.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid itinerary format' },
        { status: 400 }
      );
    }

    // First check if the trip exists
    const { data: trip, error: tripError } = await supabase
      .from('trips')
      .select('id, user_id')
      .eq('id', tripId)
      .single();

    if (tripError || !trip) {
      console.error('Error fetching trip:', tripError);
      return NextResponse.json(
        { success: false, error: 'Trip not found' },
        { status: 404 }
      );
    }

    // Check if the user has access to this trip
    if (trip.user_id !== userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: User does not have access to this trip' },
        { status: 403 }
      );
    }

    // Save the itinerary
    const result = await itineraryService.saveItinerary({
      tripId,
      userId,
      itinerary
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.message, details: result.error },
        { status: 500 }
      );
    }

    // Update trip status to indicate it has an itinerary
    const { error: updateError } = await supabase
      .from('trips')
      .update({ 
        status: 'planned',
        updated_at: new Date().toISOString() 
      })
      .eq('id', tripId);

    if (updateError) {
      console.error('Error updating trip status:', updateError);
    }

    return NextResponse.json({
      success: true,
      message: result.message,
      itineraryId: result.itineraryId
    });
  } catch (error: any) {
    console.error('Error in save-itinerary API route:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to save itinerary' },
      { status: 500 }
    );
  }
}
