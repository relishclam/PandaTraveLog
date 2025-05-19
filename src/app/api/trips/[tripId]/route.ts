// src/app/api/trips/[tripId]/route.ts
import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET(
  request: NextRequest,
  { params }: { params: { tripId: string } }
) {
  try {
    const { tripId } = params;
    console.log(`Fetching trip with ID: ${tripId}`);

    // Handle trip IDs that use the "trip-" prefix format
    const actualTripId = tripId.startsWith('trip-') 
      ? tripId.replace('trip-', '') 
      : tripId;
    
    console.log(`Normalized trip ID for database query: ${actualTripId}`);

    // Query the trips table
    const { data: trip, error } = await supabase
      .from('trips')
      .select(`
        *,
        additional_destinations:trip_destinations(*)
      `)
      .eq('id', actualTripId)
      .single();

    if (error) {
      console.error('Error fetching trip from Supabase:', error);
      return NextResponse.json(
        { error: `Failed to fetch trip: ${error.message}` },
        { status: 500 }
      );
    }

    if (!trip) {
      console.error(`Trip with ID ${actualTripId} not found`);
      return NextResponse.json(
        { error: 'Trip not found' },
        { status: 404 }
      );
    }

    console.log(`Successfully fetched trip: ${trip.title}`);
    
    // Return the trip data
    return NextResponse.json(trip);
  } catch (error: any) {
    console.error('Unexpected error in trip fetch API:', error);
    return NextResponse.json(
      { error: `Server error: ${error.message}` },
      { status: 500 }
    );
  }
}
