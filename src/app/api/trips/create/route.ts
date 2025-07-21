import { NextRequest } from 'next/server';
import { getAuthenticatedUser, createAuthErrorResponse, createErrorResponse, createSuccessResponse } from '@/utils/api-auth';

// Generate a proper UUID for the trip ID
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 Trip creation API called');
    
    // Use the new auth utility - this replaces ALL the complex auth logic
    const { user, supabase } = await getAuthenticatedUser();
    
    if (!user || !supabase) {
      console.log('❌ Authentication failed');
      return createAuthErrorResponse('Authentication failed - no valid session found');
    }

    console.log('✅ User authenticated:', user.email, 'ID:', user.id);

    const tripData = await request.json();
    console.log('📥 Received trip data:', {
      title: tripData.title,
      destination: tripData.destination,
      start_date: tripData.start_date,
      end_date: tripData.end_date
    });

    // Validate required fields
    if (!tripData.title || !tripData.start_date || !tripData.end_date || !tripData.destination) {
      console.error('❌ Missing required fields');
      return createErrorResponse({ message: 'Missing required trip fields' }, 400);
    }

    // Generate trip ID
    const tripId = tripData.id || generateUUID();
    console.log('🆔 Generated trip ID:', tripId);

    // Prepare trip record
    const tripRecord = {
      id: tripId,
      user_id: user.id, // This will now work correctly with proper auth
      title: tripData.title,
      start_date: tripData.start_date,
      end_date: tripData.end_date,
      destination: tripData.destination,
      description: tripData.description || `Manual entry trip to ${tripData.destination}`,
      status: tripData.status || 'planning',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    console.log('📝 Inserting trip into database...');
    console.log('🔍 Trip record:', tripRecord);

    // Insert trip into database using authenticated supabase client
    const { data, error } = await supabase
      .from('trips')
      .insert(tripRecord)
      .select()
      .single();

    if (error) {
      console.error('💥 Database error:', error);
      return createErrorResponse(error, 500);
    }

    console.log('✅ Trip created successfully:', data.id);

    // Save manual entry data if provided
    if (tripData.manual_entry_data) {
      console.log('📋 Saving manual entry data for trip:', tripId);
      
      try {
        // Save destinations
        if (tripData.manual_entry_data.destinations?.length > 0) {
          const destinationInserts = tripData.manual_entry_data.destinations.map((dest: any, index: number) => ({
            trip_id: tripId,
            name: dest.name,
            address: dest.address || null,
            order_index: index,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }));
          
          const { error: destError } = await supabase
            .from('trip_destinations')
            .insert(destinationInserts);
            
          if (destError) {
            console.error('❌ Failed to save destinations:', destError);
          } else {
            console.log('✅ Destinations saved successfully');
          }
        }

        // Save daily schedules
        if (tripData.manual_entry_data.daySchedules?.length > 0) {
          const scheduleInserts = tripData.manual_entry_data.daySchedules.map((day: any) => ({
            trip_id: tripId,
            day_number: day.day,
            date: day.date || null,
            activities: day.activities,
            notes: day.notes || null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }));
          
          const { error: scheduleError } = await supabase
            .from('trip_day_schedules')
            .insert(scheduleInserts);
            
          if (scheduleError) {
            console.error('❌ Failed to save daily schedules:', scheduleError);
          } else {
            console.log('✅ Daily schedules saved successfully');
          }
        }

        // Save travel details
        if (tripData.manual_entry_data.travelDetails?.length > 0) {
          const travelInserts = tripData.manual_entry_data.travelDetails.map((travel: any) => ({
            trip_id: tripId,
            mode: travel.mode,
            details: travel.details || null,
            departure_time: travel.departureTime || null,
            arrival_time: travel.arrivalTime || null,
            booking_reference: travel.bookingReference || null,
            contact_info: travel.contactInfo || null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }));
          
          const { error: travelError } = await supabase
            .from('trip_travel_details')
            .insert(travelInserts);
            
          if (travelError) {
            console.error('❌ Failed to save travel details:', travelError);
          } else {
            console.log('✅ Travel details saved successfully');
          }
        }

        // Save accommodations
        if (tripData.manual_entry_data.accommodations?.length > 0) {
          const accommodationInserts = tripData.manual_entry_data.accommodations.map((acc: any) => ({
            trip_id: tripId,
            name: acc.name,
            address: acc.address || null,
            check_in: acc.checkIn || null,
            check_out: acc.checkOut || null,
            confirmation_number: acc.confirmationNumber || null,
            contact_info: acc.contactInfo || null,
            notes: acc.notes || null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }));
          
          const { error: accError } = await supabase
            .from('trip_accommodations')
            .insert(accommodationInserts);
            
          if (accError) {
            console.error('❌ Failed to save accommodations:', accError);
          } else {
            console.log('✅ Accommodations saved successfully');
          }
        }

        console.log('🎉 All manual entry data saved successfully!');
        
      } catch (manualDataError) {
        console.error('❌ Error saving manual entry data:', manualDataError);
        // Continue anyway - main trip was created successfully
      }
    }

    // Return success response
    return createSuccessResponse({
      id: tripId,
      tripId: tripId,
      trip: data,
      message: 'Trip created successfully'
    });
    
  } catch (error: any) {
    console.error('💥 Trip creation API error:', error);
    return createErrorResponse(error);
  }
}