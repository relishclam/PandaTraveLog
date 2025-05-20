import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Validate environment variables
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables:', {
    url: supabaseUrl ? 'Set' : 'Missing',
    key: supabaseAnonKey ? 'Set' : 'Missing'
  });
}

// Create the Supabase client with proper options
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false, // Don't persist session in server environment
    autoRefreshToken: false // Don't auto refresh token in server environment
  },
  global: {
    fetch: fetch // Use the global fetch
  }
});

export async function POST(request: NextRequest) {
  try {
    const tripData = await request.json();
    console.log('Received trip data:', tripData);
    
    // Log Supabase connection details
    console.log('Supabase connection details:', {
      url: supabaseUrl,
      keyLength: supabaseAnonKey ? supabaseAnonKey.length : 0,
      hasKey: !!supabaseAnonKey
    });
    
    // Validate required fields
    if (!tripData.id || !tripData.title || !tripData.start_date || !tripData.end_date || !tripData.destination) {
      return NextResponse.json(
        { error: 'Missing required trip fields' },
        { status: 400 }
      );
    }
    
    // Get the authenticated user
    let userId;
    try {
      const { data: { session }, error: authError } = await supabase.auth.getSession();
      
      if (authError) {
        console.error('Auth error:', authError);
        return NextResponse.json(
          { error: 'Authentication error', details: authError.message },
          { status: 401 }
        );
      }
      
      userId = session?.user?.id;
      
      if (!userId) {
        console.log('No user session found, using fallback ID');
        // For development/demo, use a fallback ID if no session
        userId = tripData.user_id || 'demo-user';
      }
    } catch (authErr: any) {
      console.error('Error getting auth session:', authErr);
      // Continue with a fallback user ID for development
      userId = tripData.user_id || 'demo-user';
    }
    
    // Ensure the trip has a user_id
    tripData.user_id = userId;
    
    // Test the database connection first
    try {
      const { error: pingError } = await supabase.from('trips').select('id').limit(1);
      if (pingError) {
        console.error('Database ping failed:', pingError);
        return NextResponse.json(
          { error: 'Database connection test failed', details: pingError.message },
          { status: 500 }
        );
      }
    } catch (pingErr: any) {
      console.error('Error pinging database:', pingErr);
      return NextResponse.json(
        { error: 'Database connection error', details: pingErr.message },
        { status: 500 }
      );
    }
    
    // Create the trip in the database - ensure we're using the correct column names and data types
    // Based on the error, 'destination_coords' column doesn't exist in the trips table
    
    // Prepare the trip record with the columns we know exist in the database
    const tripRecord = {
      // Use the ID without the 'trip-' prefix for database
      id: tripData.id.replace('trip-', ''),
      user_id: tripData.user_id,
      title: tripData.title,
      start_date: tripData.start_date,
      end_date: tripData.end_date,
      // Ensure budget is a number or null
      budget: typeof tripData.budget === 'number' ? tripData.budget : 
              (tripData.budget ? parseFloat(tripData.budget) : null),
      notes: tripData.notes || '',
      destination: tripData.destination,
      place_id: tripData.place_id || '',
      status: 'planning',
      created_at: new Date().toISOString()
    };
    
    // Add latitude and longitude if they exist in the destination_coords
    if (tripData.destination_coords) {
      // Use the separate latitude and longitude columns you mentioned
      if (tripData.destination_coords.lat) {
        (tripRecord as any).destination_latitude = tripData.destination_coords.lat;
      }
      if (tripData.destination_coords.lng) {
        (tripRecord as any).destination_longitude = tripData.destination_coords.lng;
      }
    }
    
    console.log('Inserting trip record:', tripRecord);
    
    const { data, error } = await supabase
      .from('trips')
      .insert(tripRecord)
      .select();
    
    if (error) {
      console.error('Error creating trip in database:', error);
      console.error('Supabase connection details:', {
        url: supabaseUrl ? 'Set' : 'Not set',
        key: supabaseAnonKey ? 'Set' : 'Not set',
        error: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      
      return NextResponse.json(
        { 
          error: 'Failed to create trip in database', 
          details: error.message,
          code: error.code
        },
        { status: 500 }
      );
    }
    
    // If additional destinations exist, save them too
    if (tripData.additional_destinations && tripData.additional_destinations.length > 0) {
      const tripId = tripData.id; // Use the pre-generated ID
      
      // In a production app, you would insert these into a separate table
      console.log('Additional destinations for trip', tripId, ':', tripData.additional_destinations);
    }
    
    // Return the same trip ID that was provided
    return NextResponse.json({
      id: tripData.id,
      message: 'Trip created successfully'
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
