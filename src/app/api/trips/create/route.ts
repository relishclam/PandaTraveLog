import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function POST(request: Request) {
  try {
    const tripData = await request.json();
    
    // Validate required fields
    if (!tripData.user_id || !tripData.title || !tripData.start_date || !tripData.end_date || !tripData.destination) {
      return NextResponse.json(
        { error: 'Missing required trip fields' },
        { status: 400 }
      );
    }
    
    // Insert into trips table with the client-provided ID
    const { data, error } = await supabase
      .from('trips')
      .insert([
        {
          id: tripData.id, // Use the pre-generated ID from client
          user_id: tripData.user_id,
          title: tripData.title,
          start_date: tripData.start_date,
          end_date: tripData.end_date,
          budget: tripData.budget,
          notes: tripData.notes,
          destination: tripData.destination,
          destination_coords: tripData.destination_coords,
          place_id: tripData.place_id,
          status: 'planning', // Initial status
          created_at: new Date().toISOString()
        }
      ])
      .select();
    
    if (error) {
      console.error('Error creating trip in database:', error);
      
      return NextResponse.json(
        { error: 'Failed to create trip in database' },
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
    
    return NextResponse.json(
      { error: error.message || 'Failed to create trip' },
      { status: 500 }
    );
  }
}
