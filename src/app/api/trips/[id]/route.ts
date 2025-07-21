// src/app/api/trips/[id]/route.ts
import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id: tripId } = params;
    
    // Get the authorization token from headers
    const authHeader = request.headers.get('authorization');
    let userId = null;

    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      
      try {
        // Verify the JWT token and get user
        const { data: { user: verifiedUser }, error: authError } = await supabase.auth.getUser(token);
        
        if (authError) {
          console.log(`[info] Token verification failed: ${authError.message}`);
        } else if (verifiedUser) {
          userId = verifiedUser.id;
          console.log(`[info] Token verified successfully for user: ${userId}`);
        }
      } catch (authErr) {
        console.log(`[info] Authentication error: ${authErr}`);
      }
    }

    console.log(`[info] Fetching trip with ID: ${tripId}`);
    console.log(`[info] Current user ID: ${userId || 'Not authenticated'}`);

    // Log all trips in the database for debugging
    const { data: allTrips, error: allTripsError } = await supabase
      .from('trips')
      .select('id, title')
      .limit(10);
    
    console.log('[info] Available trips in database:', allTrips || 'None found', allTripsError);

    // First try to find the trip directly by the full ID (trip-timestamp format)
    const { data: tripByFullId, error: fullIdError } = await supabase
      .from('trips')
      .select('*')
      .eq('id', tripId)
      .single();

    if (!fullIdError && tripByFullId) {
      console.log('[info] Found trip by full ID lookup');
      return handleTripResponse(tripByFullId, tripId);
    }
    console.log('[info] Full ID lookup failed:', fullIdError);

    // If that fails, try to extract the numeric part if it's in the format 'trip-1234567890'
    if (tripId.startsWith('trip-')) {
      const numericId = tripId.replace('trip-', '');
      console.log(`[info] Extracted numeric ID: ${numericId}`);

      // Try direct lookup with just the numeric part
      const { data: tripByNumericId, error: numericIdError } = await supabase
        .from('trips')
        .select('*')
        .eq('id', numericId)
        .single();

      if (!numericIdError && tripByNumericId) {
        console.log('[info] Found trip by numeric ID lookup');
        return handleTripResponse(tripByNumericId, tripId);
      }
      console.log('[info] Numeric ID lookup failed:', numericIdError);

      // Try with a LIKE query as a fallback
      const { data: tripByLikeId, error: likeIdError } = await supabase
        .from('trips')
        .select('*')
        .like('id', `%${numericId}%`)
        .limit(1);

      if (!likeIdError && tripByLikeId && tripByLikeId.length > 0) {
        console.log('[info] Found trip by LIKE ID lookup');
        return handleTripResponse(tripByLikeId[0], tripId);
      }
      console.log('[info] LIKE ID lookup failed:', likeIdError);
    }

    // As a last resort, get the most recent trip for the user
    if (userId) {
      const { data: latestTrip, error: latestError } = await supabase
        .from('trips')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1);
      
      if (!latestError && latestTrip && latestTrip.length > 0) {
        console.log(`[info] Using most recent trip as fallback: ${latestTrip[0].id}`);
        return handleTripResponse(latestTrip[0], tripId);
      }
      console.log('[info] Latest trip lookup failed:', latestError);
    }
    
    // If we still haven't found anything, return 404
    console.error(`[error] No trips found for ID ${tripId} after all attempts`);
    console.error('[error] Supabase connection details:', {
      url: supabaseUrl ? 'Set' : 'Not set',
      key: supabaseKey ? 'Key set' : 'No key set',
      tripId,
      rawId: tripId.replace('trip-', ''),
      userId
    });
    
    return NextResponse.json(
      { 
        error: 'Trip not found', 
        details: `No trip found with ID ${tripId}`,
        requestedId: tripId
      },
      { status: 404 }
    );
  } catch (error: any) {
    console.error('[error] Unexpected error in trip fetch API:', error);
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
      console.log(`[info] Found ${destinations.length} additional destinations for trip`);
      additionalDestinations = destinations;
    } else {
      console.log('[info] No additional destinations found for trip');
      // If trip has additional_destinations as a JSON field, use that
      if (trip.additional_destinations && Array.isArray(trip.additional_destinations)) {
        additionalDestinations = trip.additional_destinations;
        console.log(`[info] Using ${additionalDestinations.length} destinations from trip JSON field`);
      }
    }
  } catch (destErr) {
    console.warn('[warn] Failed to fetch additional destinations:', destErr);
    // Continue even if this fails
  }

  // With our new approach, the trip ID should already be in the correct format
  // (either the full 'trip-timestamp' format or just the UUID)
  const formattedTripId = trip.id.startsWith('trip-') ? trip.id : `trip-${trip.id}`;

  // Combine the data
  const tripWithDestinations = {
    ...trip,
    additional_destinations: additionalDestinations,
    // Use the consistent ID format for client identification
    client_id: formattedTripId,
    // Ensure the trip_id is always in the 'trip-XXX' format for frontend consistency
    trip_id: formattedTripId
  };

  console.log(`[info] Successfully fetched trip: ${trip.title}`);
  console.log(`[info] Returning trip with ${additionalDestinations.length} additional destinations`);
  console.log(`[info] Using consistent trip ID format: ${formattedTripId}`);
  
  // Return the combined trip data
  return NextResponse.json(tripWithDestinations);
}