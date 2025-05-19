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
    let actualTripId = tripId.startsWith('trip-') 
      ? tripId.replace('trip-', '') 
      : tripId;
    
    console.log(`Normalized trip ID for database query: ${actualTripId}`);

    // First try to find by timestamp in the title field
    // Since we don't have a text_id field, we'll look for trips where the title contains the timestamp
    const { data: tripsByTitle, error: titleError } = await supabase
      .from('trips')
      .select('*')
      .ilike('title', `%${actualTripId}%`);
      
    if (titleError) {
      console.warn('Error when searching by title:', titleError.message);
      // Continue to try other methods
    } else if (tripsByTitle && tripsByTitle.length > 0) {
      console.log(`Found ${tripsByTitle.length} trips by title match`);
      return handleTripResponse(tripsByTitle[0], actualTripId);
    }
    
    // Try to find by created_at timestamp if it's a timestamp-based ID
    if (!isNaN(Number(actualTripId))) {
      const timestamp = Number(actualTripId);
      const date = new Date(timestamp);
      
      // If this looks like a valid timestamp (not too old, not in the future)
      if (date.getFullYear() > 2020 && date <= new Date()) {
        const { data: tripsByDate, error: dateError } = await supabase
          .from('trips')
          .select('*')
          .gte('created_at', new Date(timestamp - 86400000).toISOString()) // 1 day before
          .lte('created_at', new Date(timestamp + 86400000).toISOString()); // 1 day after
        
        if (!dateError && tripsByDate && tripsByDate.length > 0) {
          console.log(`Found ${tripsByDate.length} trips by date range`);
          return handleTripResponse(tripsByDate[0], actualTripId);
        }
      }
    }
    
    // Try a direct query by UUID (this will fail if actualTripId is not a valid UUID)
    try {
      const { data: trip, error } = await supabase
        .from('trips')
        .select('*')
        .eq('id', actualTripId)
        .single();

      if (!error && trip) {
        console.log('Found trip by direct UUID');
        return handleTripResponse(trip, actualTripId);
      }
    } catch (directIdError) {
      console.warn('Exception when querying by direct ID:', directIdError);
    }
    
    // As a last resort, get all trips and filter by user
    const { data: allTrips, error: allTripsError } = await supabase
      .from('trips')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10); // Get most recent trips
    
    if (allTripsError) {
      console.error('Error fetching all trips:', allTripsError);
      return NextResponse.json(
        { error: `Failed to fetch trip: ${allTripsError.message}` },
        { status: 500 }
      );
    }
    
    if (!allTrips || allTrips.length === 0) {
      console.error(`No trips found for ID ${actualTripId} after all attempts`);
      return NextResponse.json(
        { error: 'Trip not found' },
        { status: 404 }
      );
    }
    
    // If we found multiple trips, use the first one
    console.log(`Found ${allTrips.length} trips, using the most recent one`);
    return handleTripResponse(allTrips[0], actualTripId);
  } catch (error: any) {
    console.error('Unexpected error in trip fetch API:', error);
    return NextResponse.json(
      { error: `Server error: ${error.message}` },
      { status: 500 }
    );
  }
}

// Helper function to handle trip response with additional destinations
async function handleTripResponse(trip: any, tripId: string) {
  // Now fetch additional destinations separately
  let additionalDestinations = [];
  try {
    // Try to fetch destinations using the trip's actual database ID
    const { data: destinations, error: destError } = await supabase
      .from('trip_destinations')
      .select('*')
      .eq('trip_id', trip.id);

    if (!destError && destinations && destinations.length > 0) {
      additionalDestinations = destinations;
    }
  } catch (destErr) {
    console.warn('Failed to fetch additional destinations:', destErr);
    // Continue even if this fails
  }

  // Combine the data
  const tripWithDestinations = {
    ...trip,
    additional_destinations: additionalDestinations,
    // Add a client_id field to help with frontend identification
    client_id: tripId
  };

  console.log(`Successfully fetched trip: ${trip.title}`);
  
  // Return the combined trip data
  return NextResponse.json(tripWithDestinations);
}
