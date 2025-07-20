// src/app/api/trips/[tripId]/itinerary/route.ts
import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

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
  { params }: { params: { tripId: string } }
) {
  try {
    const { tripId } = params;
    console.log(`Saving itinerary for trip with ID: ${tripId}`);
    
    const { itinerary } = await request.json();
    
    if (!itinerary) {
      return NextResponse.json(
        { error: 'Missing itinerary data' },
        { status: 400 }
      );
    }
    
    // Get the authenticated user to verify ownership
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id;
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    // Verify trip ownership
    const { data: trip, error: tripError } = await supabase
      .from('trips')
      .select('id, user_id')
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
    
    // Create a new itinerary record
    const { data: savedItinerary, error: saveError } = await supabase
      .from('itineraries')
      .upsert({
        trip_id: trip.id,
        name: processedItinerary.title || `Itinerary for ${tripId}`,
        description: processedItinerary.description || '',
        created_at: new Date().toISOString(),
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
        const { error: locationError } = await supabase
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
      console.error('Supabase connection details:', {
        url: supabaseUrl ? 'Set' : 'Not set',
        key: supabaseKey ? 'Set' : 'Not set',
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
    await supabase
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
  { params }: { params: { tripId: string } }
) {
  try {
    const { tripId } = params;
    console.log(`Fetching itinerary for trip with ID: ${tripId}`);
    
    // Get the authenticated user
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id;
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    // First, verify trip ownership
    const { data: trip, error: tripError } = await supabase
      .from('trips')
      .select('id, user_id')
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
        { error: 'Not authorized to view this trip' },
        { status: 403 }
      );
    }
    
    // Fetch the itinerary
    const { data: itinerary, error: itineraryError } = await supabase
      .from('trip_itineraries')
      .select('*')
      .eq('trip_id', trip.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    if (itineraryError) {
      console.error('Error fetching itinerary:', itineraryError);
      return NextResponse.json(
        { error: 'Itinerary not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      itinerary: itinerary.itinerary_data
    });
  } catch (error: any) {
    console.error('Unexpected error in fetch itinerary API:', error);
    return NextResponse.json(
      { error: `Server error: ${error.message}` },
      { status: 500 }
    );
  }
}
