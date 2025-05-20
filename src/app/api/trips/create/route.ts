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
  },
  db: {
    schema: 'public'
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
    
    // Generate a proper UUID for the trip ID
    const generateUUID = () => {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    };
    
    // Prepare the trip record with the columns from the Supabase schema
    const tripRecord: Record<string, any> = {
      // Required fields
      id: generateUUID(),
      user_id: tripData.user_id,
      title: tripData.title,
      start_date: tripData.start_date,
      end_date: tripData.end_date,
      destination: tripData.destination,
      
      // Optional fields with defaults
      description: tripData.description || '',
      budget: typeof tripData.budget === 'number' ? tripData.budget : 
             (tripData.budget ? parseFloat(tripData.budget) : null),
      currency: tripData.currency || 'USD',
      status: 'planning',
      is_public: tripData.is_public || false,
      Interests: tripData.interests || '', // Note: Capital 'I' to match schema
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      
      // Destination details
      destination_name: tripData.destination_name || tripData.destination,
      destination_city: tripData.destination_city || '',
      destination_country: tripData.destination_country || '',
      place_id: tripData.place_id || ''
    };
    
    // Add coordinates if provided
    if (tripData.destination_coords) {
      if (tripData.destination_coords.lat !== undefined) {
        tripRecord.destination_lat = parseFloat(tripData.destination_coords.lat);
      }
      if (tripData.destination_coords.lng !== undefined) {
        tripRecord.destination_lng = parseFloat(tripData.destination_coords.lng);
      }
      console.log('Added coordinates to trip record:', {
        lat: tripData.destination_coords.lat,
        lng: tripData.destination_coords.lng
      });
    }
    
    // Handle cover image if provided
    if (tripData.cover_image_url) {
      tripRecord.cover_image_url = tripData.cover_image_url;
    }
    
    console.log('Inserting trip record:', tripRecord);
    
    // Try using the Supabase builder pattern first since we've added the columns to the database
    let data: any = null;
    let error: any = null;
    
    try {
      const result = await supabase
        .from('trips')
        .insert(tripRecord)
        .select();
        
      data = result.data;
      error = result.error;
      
      // If there's an error with the builder pattern, try a raw SQL query
      if (error) {
        console.log('Builder pattern failed, trying raw SQL query:', error);
        
        // Create a raw SQL query string
        const query = `
          INSERT INTO trips (
            id, user_id, title, start_date, end_date, budget, 
            interests, destination, place_id, status, created_at,
            destination_lat, destination_lng
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13
          )
          RETURNING *
        `;
        
        const values = [
          tripRecord.id,
          tripRecord.user_id,
          tripRecord.title,
          tripRecord.start_date,
          tripRecord.end_date,
          tripRecord.budget,
          tripRecord.interests,
          tripRecord.destination,
          tripRecord.place_id,
          tripRecord.status,
          tripRecord.created_at,
          (tripRecord as any).destination_lat,
          (tripRecord as any).destination_lng
        ];
        
        const rawResult = await supabase.rpc('exec_sql', { query, params: values });
        
        if (!rawResult.error) {
          data = rawResult.data;
          error = null;
        } else {
          console.error('Raw SQL query also failed:', rawResult.error);
        }
      }
    } catch (e) {
      console.error('Exception during database operation:', e);
      error = e;
    }
    
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
    
    // Return the generated UUID as the trip ID
    return NextResponse.json({
      id: tripRecord.id,
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
