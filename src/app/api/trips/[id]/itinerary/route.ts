import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client with service role key for admin operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// Helper function to ensure all coordinates in the itinerary are properly formatted
function processItineraryCoordinates(itinerary: any): any {
  if (!itinerary) return itinerary;
  
  // Deep clone the itinerary to avoid modifying the original
  const processedItinerary = JSON.parse(JSON.stringify(itinerary));
  
  // Process days array if it exists
  if (Array.isArray(processedItinerary.days)) {
    processedItinerary.days = processedItinerary.days.map((day: any) => {
      // Process activities array if it exists
      if (Array.isArray(day.activities)) {
        day.activities = day.activities.map((activity: any) => {
          // Ensure location has proper lat/lng format for Geoapify
          if (activity.location) {
            // Normalize the location format
            if (typeof activity.location === 'object') {
              // Ensure lat and lng properties exist and are numbers
              if (activity.location.lat === undefined && activity.location.latitude !== undefined) {
                activity.location.lat = Number(activity.location.latitude);
              }
              if (activity.location.lng === undefined && activity.location.longitude !== undefined) {
                activity.location.lng = Number(activity.location.longitude);
              }
              
              // Convert to numbers if they're strings
              if (typeof activity.location.lat === 'string') {
                activity.location.lat = Number(activity.location.lat);
              }
              if (typeof activity.location.lng === 'string') {
                activity.location.lng = Number(activity.location.lng);
              }
            }
          }
          return activity;
        });
      }
      return day;
    });
  }
  
  return processedItinerary;
}

// Helper function to extract locations from the itinerary for saving to the locations table
function extractLocationsFromItinerary(itinerary: any): any[] {
  if (!itinerary) return [];
  
  const locations: any[] = [];
  let orderCounter = 0;
  
  // Extract from days and activities
  if (Array.isArray(itinerary.days)) {
    itinerary.days.forEach((day: any, dayIndex: number) => {
      if (Array.isArray(day.activities)) {
        day.activities.forEach((activity: any, activityIndex: number) => {
          if (activity.location && activity.location.lat && activity.location.lng) {
            locations.push({
              day: dayIndex + 1,
              activity_index: activityIndex,
              name: activity.name || activity.title || `Activity ${activityIndex + 1}`,
              type: activity.type || 'activity',
              lat: activity.location.lat,
              lng: activity.location.lng,
              description: activity.description || '',
              place_id: activity.place_id || '',
              order: orderCounter++
            });
          }
        });
      }
    });
  }
  
  // If no activities with locations, add at least the main destination if available
  if (locations.length === 0 && itinerary.destination && itinerary.destination.lat && itinerary.destination.lng) {
    locations.push({
      name: itinerary.destination.name || 'Main Destination',
      lat: itinerary.destination.lat,
      lng: itinerary.destination.lng,
      place_id: itinerary.destination.place_id || '',
      order: 0
    });
  }
  
  return locations;
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tripId = params.id;
    console.log(`Saving itinerary for trip with ID: ${tripId}`);
    
    const { itinerary } = await request.json();
    
    if (!itinerary) {
      return NextResponse.json(
        { error: 'Missing itinerary data' },
        { status: 400 }
      );
    }
    
    // Get the authenticated user to verify ownership
    const { data: { session } } = await supabaseAdmin.auth.getSession();
    const userId = session?.user?.id;
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    // First, verify trip ownership
    const { data: trip, error: tripError } = await supabaseAdmin
      .from('trips')
      .select('id, user_id, name, destination, start_date, end_date')
      .eq('id', tripId.replace('trip-', ''))
      .single();
    
    if (tripError || !trip) {
      console.error('Error fetching trip:', tripError);
      return NextResponse.json(
        { error: 'Trip not found' },
        { status: 404 }
      );
    }
    
    if (trip.user_id !== userId) {
      return NextResponse.json(
        { error: 'Not authorized to modify this trip' },
        { status: 403 }
      );
    }
    
    // Process the itinerary to ensure all location coordinates are properly formatted
    const processedItinerary = processItineraryCoordinates(itinerary);
    
    // Save the itinerary to the database
    const { data: savedItinerary, error: saveError } = await supabaseAdmin
      .from('trip_itineraries')
      .upsert({
        trip_id: trip.id,
        itinerary_data: processedItinerary,
        updated_at: new Date().toISOString()
      })
      .select();
      
    if (saveError) {
      console.error('Error saving itinerary:', saveError);
      return NextResponse.json(
        { error: 'Failed to save itinerary', details: saveError.message },
        { status: 500 }
      );
    }
    
    // Extract and save locations to the locations table
    if (savedItinerary && savedItinerary.length > 0) {
      const itineraryId = savedItinerary[0].id;
      
      // Extract locations from the itinerary
      const locations = extractLocationsFromItinerary(processedItinerary);
      
      // Save each location to the locations table
      for (const location of locations) {
        const { error: locationError } = await supabaseAdmin
          .from('locations')
          .insert({
            itinerary_id: itineraryId,
            lat: location.lat,
            lng: location.lng,
            address: location.name || '',
            place_id: location.place_id || '',
            order: location.order || 0
          });
          
        if (locationError) {
          console.error('Error saving location:', locationError);
          // Continue with other locations even if one fails
        }
      }
    }
    
    if (saveError) {
      console.error('Error saving itinerary:', saveError);
      console.error('Supabase connection error:', {
        error: typeof saveError === 'object' ? (saveError as any).message : String(saveError)
      });
      
      return NextResponse.json(
        { 
          error: 'Failed to save itinerary', 
          details: typeof saveError === 'object' ? (saveError as any).message : String(saveError)
        },
        { status: 500 }
      );
    }
    
    // Update trip status to 'planned'
    await supabaseAdmin
      .from('trips')
      .update({ status: 'planned' })
      .eq('id', trip.id);
    
    return NextResponse.json({
      success: true,
      message: 'Itinerary saved successfully',
      itineraryId: savedItinerary ? savedItinerary[0]?.id : null
    });
  } catch (error: any) {
    console.error('Unexpected error in save itinerary API:', error);
    return NextResponse.json(
      { error: `Server error: ${error.message}` },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tripId = params.id;
    console.log(`Fetching itinerary for trip with ID: ${tripId}`);
    
    if (!tripId) {
      return NextResponse.json(
        { error: 'Trip ID is required' },
        { status: 400 }
      );
    }

    // Get itinerary items for the trip
    const { data: itinerary, error } = await supabaseAdmin
      .from('itinerary_items')
      .select(`
        id,
        trip_id,
        day_number,
        time,
        activity_type,
        title,
        description,
        location,
        address,
        coordinates,
        duration_minutes,
        cost_estimate,
        booking_info,
        notes,
        created_at,
        updated_at
      `)
      .eq('trip_id', tripId)
      .order('day_number', { ascending: true })
      .order('time', { ascending: true });
    
    if (error) {
      console.error('Error fetching itinerary:', error);
      return NextResponse.json(
        { error: 'Failed to fetch itinerary' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      itinerary: itinerary || [],
      success: true
    });
  } catch (error: any) {
    console.error('Unexpected error in fetch itinerary API:', error);
    return NextResponse.json(
      { error: `Server error: ${error.message}` },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tripId = params.id;
    const body = await request.json();
    const { itemId, ...updateData } = body;

    if (!tripId || !itemId) {
      return NextResponse.json(
        { error: 'Trip ID and Item ID are required' },
        { status: 400 }
      );
    }

    // Update itinerary item
    const { data: itineraryItem, error } = await supabaseAdmin
      .from('itinerary_items')
      .update(updateData)
      .eq('id', itemId)
      .eq('trip_id', tripId)
      .select()
      .single();

    if (error) {
      console.error('Error updating itinerary item:', error);
      return NextResponse.json(
        { error: 'Failed to update itinerary item' },
        { status: 500 }
      );
    }

    return NextResponse.json({ itineraryItem, success: true });
  } catch (error: any) {
    console.error('Unexpected error updating itinerary item:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tripId = params.id;
    const { searchParams } = new URL(request.url);
    const itemId = searchParams.get('itemId');

    if (!tripId || !itemId) {
      return NextResponse.json(
        { error: 'Trip ID and Item ID are required' },
        { status: 400 }
      );
    }

    // Delete itinerary item
    const { error } = await supabaseAdmin
      .from('itinerary_items')
      .delete()
      .eq('id', itemId)
      .eq('trip_id', tripId);

    if (error) {
      console.error('Error deleting itinerary item:', error);
      return NextResponse.json(
        { error: 'Failed to delete itinerary item' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, message: 'Itinerary item deleted successfully' });
  } catch (error: any) {
    console.error('Unexpected error deleting itinerary item:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}