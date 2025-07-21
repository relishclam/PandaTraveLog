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
    
    // Get itinerary data - adjust table name and structure as needed
    const { data: itinerary, error } = await supabase
      .from('trip_itinerary') // Adjust this table name to match your database
      .select('*')
      .eq('trip_id', tripId)
      .order('day_number', { ascending: true }); // Adjust ordering as needed

    if (error) {
      console.error('[error] Error fetching itinerary:', error);
      
      // If no data found, return empty itinerary instead of error
      if (error.code === 'PGRST116') {
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
        { success: false, error: error.message || 'Failed to fetch itinerary' },
        { status: 500 }
      );
    }
    
    console.log(`[info] Successfully fetched ${itinerary?.length || 0} itinerary items`);
    
    return NextResponse.json({
      success: true,
      itinerary: {
        trip_id: tripId,
        days: itinerary || []
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