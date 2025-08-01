import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 POST /api/trips/create - Starting trip creation');
    
    // Create supabase client that can read cookies
    const supabase = createClient();
    
    // Get the authenticated user from session
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

    const { 
      title, 
      destination, 
      start_date, 
      end_date, 
      description, 
      budget, 
      currency, 
      interests,
      // Additional manual entry data
      destinations,
      daySchedules,
      travelDetails,
      accommodations
    } = body;

    // Validate required fields
    if (!title) {
      return NextResponse.json(
        { error: 'Missing required field: title' },
        { status: 400 }
      );
    }

    // Generate trip ID
    const tripId = uuidv4();
    console.log('🆔 Generated trip ID:', tripId);

    // Create trip in database using actual schema
    const { data: trip, error: tripError } = await supabase
      .from('trips')
      .insert({
        id: tripId,
        user_id: user.id,
        title,
        destination: destination || '',
        start_date: start_date || null,
        end_date: end_date || null,
        description: description || `Trip to ${destination || 'unknown destination'}`,
        budget: budget || null,
        currency: currency || 'USD',
        status: 'planning',
        interests: interests || '',
        is_public: false,
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

    // Store additional manual entry data in related tables if provided
    if (destinations && Array.isArray(destinations)) {
      console.log('💾 Storing destinations in trip_destinations table');
      for (let i = 0; i < destinations.length; i++) {
        const dest = destinations[i];
        await supabase.from('trip_destinations').insert({
          trip_id: trip.id,
          name: dest.name,
          address: dest.address || '',
          order_index: i
        });
      }
    }

    if (accommodations && Array.isArray(accommodations)) {
      console.log('💾 Storing accommodations in trip_accommodations table');
      for (const acc of accommodations) {
        await supabase.from('trip_accommodations').insert({
          trip_id: trip.id,
          name: acc.name,
          address: acc.address || '',
          check_in: acc.checkIn || null,
          check_out: acc.checkOut || null,
          contact_info: acc.contactInfo || '',
          notes: acc.notes || ''
        });
      }
    }

    if (travelDetails && Array.isArray(travelDetails)) {
      console.log('💾 Storing travel details in trip_travel_details table');
      for (const travel of travelDetails) {
        await supabase.from('trip_travel_details').insert({
          trip_id: trip.id,
          mode: travel.mode,
          details: travel.details || '',
          departure_time: travel.departureTime || null,
          arrival_time: travel.arrivalTime || null,
          booking_reference: travel.bookingReference || '',
          contact_info: travel.contactInfo || ''
        });
      }
    }

    if (daySchedules && Array.isArray(daySchedules)) {
      console.log('💾 Storing day schedules in trip_day_schedules table');
      for (const schedule of daySchedules) {
        await supabase.from('trip_day_schedules').insert({
          trip_id: trip.id,
          day_number: schedule.day,
          date: schedule.date || null,
          activities: schedule.activities || '',
          notes: schedule.notes || ''
        });
      }
    }

    console.log('💾 All trip data stored successfully');

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
