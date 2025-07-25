// src/app/api/trips/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
    const { id: tripId } = params;
    
    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log(`🔍 Fetching trip with ID: ${tripId} for user: ${user.id}`);

    // Simple, direct trip lookup with user verification
    const { data: trip, error: tripError } = await supabase
      .from('trips')
      .select('*')
      .eq('id', tripId)
      .eq('user_id', user.id)
      .single();

    if (tripError || !trip) {
      console.error(`❌ Trip not found: ${tripId}`, tripError);
      return NextResponse.json(
        { error: 'Trip not found' },
        { status: 404 }
      );
    }

    // Fetch additional trip data using unified schema
    const [companionsResult, placesResult, itineraryResult] = await Promise.all([
      supabase.from('trip_companions').select('*').eq('trip_id', tripId),
      supabase.from('trip_places').select('*').eq('trip_id', tripId).order('day_number').order('order_number'),
      supabase.from('trip_itinerary').select('*').eq('trip_id', tripId).order('day_number')
    ]);

    const tripResponse = {
      ...trip,
      companions: companionsResult.data || [],
      places: placesResult.data || [],
      itinerary: itineraryResult.data || [],
      // manual_entry_data is already included from the trips table
      additional_destinations: [] // Kept for backward compatibility, will be empty
    };

    console.log(`✅ Successfully fetched trip: ${trip.name || trip.title}`);
    return NextResponse.json(tripResponse);

  } catch (error: any) {
    console.error('❌ Unexpected error in trip fetch API:', error);
    return NextResponse.json(
      { error: `Server error: ${error.message}` },
      { status: 500 }
    );
  }
}
