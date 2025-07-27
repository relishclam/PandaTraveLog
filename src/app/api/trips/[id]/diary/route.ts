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

    const tripId = params.id;

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log(`📖 Fetching diary for trip: ${tripId}, user: ${user.id}`);

    // Verify trip ownership and get trip details
    const { data: trip, error: tripError } = await supabase
      .from('trips')
      .select('*')
      .eq('id', tripId)
      .eq('user_id', user.id)
      .single();

    if (tripError || !trip) {
      console.error(`❌ Trip not found: ${tripId}`, tripError);
      return NextResponse.json(
        { error: 'Trip not found or access denied' },
        { status: 404 }
      );
    }

    // Fetch all diary related data
    const [daySchedules, travelDetails, accommodations] = await Promise.all([
      // Get day schedules
      supabase
        .from('trip_day_schedules')
        .select('*')
        .eq('trip_id', tripId)
        .order('day_number'),
      
      // Get travel details
      supabase
        .from('trip_travel_details')
        .select('*')
        .eq('trip_id', tripId),
      
      // Get accommodations
      supabase
        .from('trip_accommodations')
        .select('*')
        .eq('trip_id', tripId)
    ]);

    // Compile diary response
    const diaryResponse = {
      trip,
      day_schedules: daySchedules.data || [],
      travel_details: travelDetails.data || [],
      accommodations: accommodations.data || []
    };

    console.log(`✅ Successfully fetched diary data for trip: ${trip.title || trip.name}`);
    return NextResponse.json(diaryResponse);

  } catch (error: any) {
    console.error('❌ Error in diary API route:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch diary data' },
      { status: 500 }
    );
  }
}
