import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 POST /api/trips/create - Starting trip creation');
    
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
    
    // Get the authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('❌ Authentication failed:', authError);
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    console.log('✅ User authenticated:', user.email);

    // Parse request body
    const body = await request.json();
    console.log('📥 Request body:', JSON.stringify(body, null, 2));

    const { title, destination, start_date, end_date, manual_entry_data } = body;

    // Validate required fields
    if (!title || !destination || !start_date || !end_date) {
      return NextResponse.json(
        { error: 'Missing required fields: title, destination, start_date, end_date' },
        { status: 400 }
      );
    }

    // Generate trip ID
    const tripId = uuidv4();
    console.log('🆔 Generated trip ID:', tripId);

    // Create trip in database
    const { data: trip, error: tripError } = await supabase
      .from('trips')
      .insert({
        id: tripId,
        user_id: user.id,
        title,
        destination,
        start_date,
        end_date,
        description: `Manual entry trip to ${destination}`,
        status: 'active',
        manual_entry_data: manual_entry_data || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (tripError) {
      console.error('❌ Error creating trip:', tripError);
      return NextResponse.json(
        { error: 'Failed to create trip: ' + tripError.message },
        { status: 500 }
      );
    }

    console.log('✅ Trip created successfully:', trip);

    // All manual entry data is now stored in the manual_entry_data JSON field
    // No need to save to separate tables - unified schema approach
    console.log('💾 Manual entry data stored in trips.manual_entry_data field');

    return NextResponse.json({
      success: true,
      tripId: trip.id,
      trip: trip,
      message: 'Trip created successfully'
    });

  } catch (error) {
    console.error('💥 Unexpected error in trip creation:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
