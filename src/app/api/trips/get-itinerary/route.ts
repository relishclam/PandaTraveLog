export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Use server-side Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

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

    // Get the authorization token from headers
    const authHeader = request.headers.get('authorization');
    let userId = null;

    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      
      try {
        // Create Supabase client with service role key for token verification
        const supabase = createClient(supabaseUrl, supabaseKey);
        const { data: { user: verifiedUser }, error: authError } = await supabase.auth.getUser(token);
        
        if (authError) {
          console.log(`[info] Token verification failed: ${authError.message}`);
        } else if (verifiedUser) {
          userId = verifiedUser.id;
          console.log(`[info] Token verified for itinerary request: ${userId}`);
        }
      } catch (authErr) {
        console.log(`[info] Authentication error: ${authErr}`);
      }
    }

    console.log(`[info] Fetching itinerary for trip: ${tripId}, user: ${userId || 'Not authenticated'}`);

    // Create Supabase client for data operations
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Get the main itinerary record
    const { data: itinerary, error: itineraryError } = await supabase
      .from('itineraries')
      .select('*')
      .eq('trip_id', tripId)
      .single();

    if (itineraryError) {
      console.error('[error] Error fetching itinerary:', itineraryError);
      
      // If no data found, return empty itinerary instead of error
      if (itineraryError.code === 'PGRST116') {
        console.log('[info] No itinerary data found, returning empty itinerary');
        return NextResponse.json({
          success: true,
          itinerary: {
            trip_id: tripId,
            days: []
          }
        });
      }
      
      return NextResponse.json(
        { success: false, error: itineraryError.message || 'Failed to fetch itinerary' },
        { status: 500 }
      );
    }

    if (!itinerary) {
      console.log('[info] No itinerary found, returning empty itinerary');
      return NextResponse.json({
        success: true,
        itinerary: {
          trip_id: tripId,
          days: []
        }
      });
    }

    // Get itinerary days
    const { data: days, error: daysError } = await supabase
      .from('itinerary_days')
      .select('*')
      .eq('itinerary_id', itinerary.id)
      .order('day_number', { ascending: true });

    if (daysError) {
      console.error('[error] Error fetching itinerary days:', daysError);
      return NextResponse.json(
        { success: false, error: daysError.message || 'Failed to fetch itinerary days' },
        { status: 500 }
      );
    }

    // Get activities and meals for each day
    const daysWithDetails = await Promise.all((days || []).map(async (day) => {
      // Get activities
      const { data: activities, error: activitiesError } = await supabase
        .from('activities')
        .select('*')
        .eq('day_id', day.id)
        .order('sort_order', { ascending: true });

      if (activitiesError) {
        console.error(`[error] Error fetching activities for day ${day.id}:`, activitiesError);
      }

      // Get meals
      const { data: meals, error: mealsError } = await supabase
        .from('meals')
        .select('*')
        .eq('day_id', day.id);

      if (mealsError) {
        console.error(`[error] Error fetching meals for day ${day.id}:`, mealsError);
      }

      // Organize meals by type
      const organizedMeals = {
        breakfast: meals?.find(m => m.type === 'breakfast'),
        lunch: meals?.find(m => m.type === 'lunch'),
        dinner: meals?.find(m => m.type === 'dinner')
      };

      return {
        ...day,
        activities: activities || [],
        meals: organizedMeals
      };
    }));
    
    console.log(`[info] Successfully fetched itinerary with ${daysWithDetails.length} days and ${daysWithDetails.reduce((total, day) => total + day.activities.length, 0)} activities`);
    
    return NextResponse.json({
      success: true,
      itinerary: {
        ...itinerary,
        trip_id: tripId,
        days: daysWithDetails
      }
    });
    
  } catch (error: any) {
    console.error('[error] Error in get-itinerary API route:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to get itinerary' },
      { status: 500 }
    );
  }
}