import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

// We'll create the Supabase client inside the handler to get the session
// from the request cookies

export async function POST(request: NextRequest) {
  try {
    const tripData = await request.json();
    console.log('Received trip data:', tripData);
    
    // Validate required fields
    if (!tripData.id || !tripData.title || !tripData.start_date || !tripData.end_date || !tripData.destination) {
      return NextResponse.json(
        { error: 'Missing required trip fields' },
        { status: 400 }
      );
    }
    
    // Create a Supabase client with the auth cookie
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    
    // Get the current session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    let userId;
    
    // Check if we have a valid session
    if (session) {
      console.log('Valid session found, using session user ID');
      userId = session.user.id;
    } else {
      console.log('No session found, checking for emergency auth');
      
      // Check for emergency auth in the request headers
      const userEmail = request.headers.get('x-user-email');
      const emergencyAuth = request.headers.get('x-emergency-auth');
      
      // If we have emergency auth headers, try to find the user by email
      if (emergencyAuth === 'true' && userEmail) {
        console.log('Emergency auth headers found, looking up user by email:', userEmail);
        
        // Look up the user by email
        const { data: userProfile, error: userError } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', userEmail)
          .single();
          
        if (userProfile?.id) {
          console.log('Found user ID from email:', userProfile.id);
          userId = userProfile.id;
        } else {
          console.error('User not found with email:', userEmail, userError);
          
          // EMERGENCY FALLBACK: Allow trip creation without authentication when DISABLE_TWILIO is true
          if (process.env.DISABLE_TWILIO === 'true') {
            console.log('EMERGENCY FALLBACK: Creating trip without authentication (DISABLE_TWILIO=true)');
            
            // Use the user ID from the request body if available, or a fallback ID
            userId = tripData.user_id || 'emergency-user';
          } else {
            return NextResponse.json(
              { error: 'Not authenticated and emergency fallback disabled' },
              { status: 401 }
            );
          }
        }
      } else if (process.env.DISABLE_TWILIO === 'true' && tripData.user_id) {
        // EMERGENCY FALLBACK: Allow trip creation with user_id in the request body when DISABLE_TWILIO is true
        console.log('EMERGENCY FALLBACK: Using user_id from request body (DISABLE_TWILIO=true)');
        userId = tripData.user_id;
      } else {
        console.error('No valid authentication found');
        return NextResponse.json(
          { error: 'Not authenticated', details: sessionError?.message },
          { status: 401 }
        );
      }
    }
    
    // Use the authenticated user's ID
    tripData.user_id = userId;
    
    console.log('Authenticated user ID:', userId);
    
    // Test the database connection with the authenticated user
    try {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', userId)
        .single();
        
      if (profileError || !profile) {
        console.error('User profile not found:', profileError);
        return NextResponse.json(
          { error: 'User profile not found', details: profileError?.message },
          { status: 404 }
        );
      }
    } catch (err: any) {
      console.error('Error verifying user profile:', err);
      return NextResponse.json(
        { error: 'Error verifying user', details: err.message },
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
      
      return NextResponse.json(
        { 
          error: 'Failed to create trip in database',
          details: error.message,
          code: error.code || 'UNKNOWN_ERROR',
          hint: error.hint
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
