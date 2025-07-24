import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 POST /api/trips/create - Starting trip creation');
    
    const supabase = createRouteHandlerClient({ cookies });
    
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

    // If manual entry data exists, save the structured data
    if (manual_entry_data) {
      console.log('💾 Saving manual entry data...');
      
      // Save day schedules
      if (manual_entry_data.daySchedules && manual_entry_data.daySchedules.length > 0) {
        const dayScheduleInserts = manual_entry_data.daySchedules.map((schedule: any) => ({
          id: uuidv4(),
          trip_id: tripId,
          day_number: schedule.day,
          date: schedule.date,
          activities: schedule.activities,
          notes: schedule.notes || null,
          created_at: new Date().toISOString()
        }));

        const { error: scheduleError } = await supabase
          .from('trip_day_schedules')
          .insert(dayScheduleInserts);

        if (scheduleError) {
          console.error('⚠️ Warning: Failed to save day schedules:', scheduleError);
        } else {
          console.log('✅ Day schedules saved');
        }
      }

      // Save travel details
      if (manual_entry_data.travelDetails && manual_entry_data.travelDetails.length > 0) {
        const travelInserts = manual_entry_data.travelDetails.map((travel: any) => ({
          id: uuidv4(),
          trip_id: tripId,
          mode: travel.mode,
          details: travel.details,
          departure_time: travel.departureTime || null,
          arrival_time: travel.arrivalTime || null,
          booking_reference: travel.bookingReference || null,
          contact_info: travel.contactInfo || null,
          created_at: new Date().toISOString()
        }));

        const { error: travelError } = await supabase
          .from('trip_travel_details')
          .insert(travelInserts);

        if (travelError) {
          console.error('⚠️ Warning: Failed to save travel details:', travelError);
        } else {
          console.log('✅ Travel details saved');
        }
      }

      // Save accommodations
      if (manual_entry_data.accommodations && manual_entry_data.accommodations.length > 0) {
        const accommodationInserts = manual_entry_data.accommodations.map((accommodation: any) => ({
          id: uuidv4(),
          trip_id: tripId,
          name: accommodation.name,
          address: accommodation.address,
          check_in: accommodation.checkIn,
          check_out: accommodation.checkOut,
          confirmation_number: accommodation.confirmationNumber || null,
          contact_info: accommodation.contactInfo || null,
          notes: accommodation.notes || null,
          created_at: new Date().toISOString()
        }));

        const { error: accommodationError } = await supabase
          .from('trip_accommodations')
          .insert(accommodationInserts);

        if (accommodationError) {
          console.error('⚠️ Warning: Failed to save accommodations:', accommodationError);
        } else {
          console.log('✅ Accommodations saved');
        }
      }
    }

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
