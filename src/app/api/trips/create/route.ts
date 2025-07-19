import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

// Generate a proper UUID for the trip ID
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export async function POST(request: NextRequest) {
  try {
    console.log('=== Manual Trip Creation API Called ===');
    
    const tripData = await request.json();
    console.log('Received trip data:', JSON.stringify(tripData, null, 2));
    
    // Validate required fields
    if (!tripData.title || !tripData.start_date || !tripData.end_date || !tripData.destination) {
      console.error('Missing required fields:', {
        title: !!tripData.title,
        start_date: !!tripData.start_date,
        end_date: !!tripData.end_date,
        destination: !!tripData.destination
      });
      return NextResponse.json(
        { error: 'Missing required trip fields' },
        { status: 400 }
      );
    }
    
    // Create Supabase client
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    
    // Get session and user ID
    const { data: { session } } = await supabase.auth.getSession();
    console.log('Session status:', session ? 'Found' : 'Not found');
    
    let userId: string;
    
    if (session?.user?.id) {
      userId = session.user.id;
      console.log('Using authenticated user ID:', userId);
    } else if (tripData.user_id) {
      userId = tripData.user_id;
      console.log('Using provided user ID:', userId);
    } else {
      return NextResponse.json(
        { error: 'No user authentication found' },
        { status: 401 }
      );
    }
    
    // Generate trip ID
    const tripId = tripData.id || generateUUID();
    console.log('Generated trip ID:', tripId);
    
    // Prepare trip record with essential fields only
    const tripRecord = {
      id: tripId,
      user_id: userId,
      name: tripData.title, // Database expects 'name' field, not 'title'
      start_date: tripData.start_date,
      end_date: tripData.end_date,
      destination: tripData.destination,
      description: tripData.description || `Manual entry trip with destinations: ${tripData.destination}`,
      status: tripData.status || 'planned', // Database expects 'planned', not 'planning'
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    console.log('Trip record to insert:', JSON.stringify(tripRecord, null, 2));
    
    // Insert trip into database
    console.log('Inserting trip into database...');
    
    const { data, error } = await supabase
      .from('trips')
      .insert(tripRecord)
      .select()
      .single();
    
    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Failed to create trip in database', details: error.message },
        { status: 500 }
      );
    }
    
    console.log('Trip created successfully:', data);
    
    // Save manual entry data if provided
    if (tripData.manual_entry_data) {
      console.log('Saving manual entry data for trip:', tripId);
      
      // Save to trip_itinerary table for manual trip data
      const { error: itineraryError } = await supabase
        .from('trip_itinerary')
        .insert({
          trip_id: tripId,
          day_number: 0,
          content: JSON.stringify(tripData.manual_entry_data)
        });
      
      if (itineraryError) {
        console.error('Failed to save manual entry data:', itineraryError);
        // Continue anyway - trip was created successfully
      }
    }
    
    // Return success response
    return NextResponse.json({
      id: tripId,
      message: 'Trip created successfully',
      data: data
    });
  } catch (error: any) {
    console.error('Error in create trip API route:', error);
    console.error('Request processing error:', {
      type: error.name,
      message: error.message,
      stack: error.stack
    });
    
    return NextResponse.json(
      { 
        error: error.message || 'Failed to create trip',
        type: error.name || 'UnknownError'
      },
      { status: 500 }
    );
  }
}
