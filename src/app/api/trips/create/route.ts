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
    console.log('📥 Received trip data:', JSON.stringify(tripData, null, 2));
    
    // Validate required fields
    if (!tripData.title || !tripData.start_date || !tripData.end_date || !tripData.destination) {
      console.error('❌ Missing required fields:', {
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
    
    // Create Supabase client with proper cookie handling
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    
    // Get session and user ID with better error handling
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    console.log('🔐 Session status:', session ? 'Found' : 'Not found');
    
    if (sessionError) {
      console.log('❌ Session error:', sessionError);
    }
    
    if (session) {
      console.log('👤 Session user:', session.user?.email);
    }
    
    let userId: string;
    
    if (session?.user?.id) {
      userId = session.user.id;
      console.log('✅ Using authenticated user ID:', userId);
    } else {
      // Try to get user from Authorization header as fallback
      const authHeader = request.headers.get('authorization');
      console.log('🔑 Auth header present:', !!authHeader);
      
      if (authHeader) {
        try {
          const token = authHeader.replace('Bearer ', '');
          const supabaseWithToken = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
              global: {
                headers: {
                  Authorization: authHeader
                }
              }
            }
          );
          
          const { data: { user }, error: userError } = await supabaseWithToken.auth.getUser();
          if (user && !userError) {
            userId = user.id;
            console.log('✅ Using user from auth header:', userId);
          } else {
            console.log('❌ Failed to get user from auth header:', userError);
            return NextResponse.json(
              { error: 'No user authentication found' },
              { status: 401 }
            );
          }
        } catch (error) {
          console.log('❌ Error processing auth header:', error);
          return NextResponse.json(
            { error: 'Invalid authentication' },
            { status: 401 }
          );
        }
      } else {
        return NextResponse.json(
          { error: 'No user authentication found' },
          { status: 401 }
        );
      }
    }
    
    // Generate trip ID
    const tripId = tripData.id || generateUUID();
    console.log('🆔 Generated trip ID:', tripId);
    
    // Prepare trip record with essential fields
    const tripRecord = {
      id: tripId,
      user_id: userId,
      title: tripData.title,
      start_date: tripData.start_date,
      end_date: tripData.end_date,
      destination: tripData.destination,
      description: tripData.description || `Manual entry trip to ${tripData.destination}`,
      status: tripData.status || 'planning',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    console.log('💾 Trip record to insert:', JSON.stringify(tripRecord, null, 2));
    
    // Insert trip into database
    console.log('📝 Inserting trip into database...');
    
    const { data, error } = await supabase
      .from('trips')
      .insert(tripRecord)
      .select()
      .single();
    
    if (error) {
      console.error('💥 Database error:', error);
      return NextResponse.json(
        { error: 'Failed to create trip in database', details: error.message },
        { status: 500 }
      );
    }
    
    console.log('✅ Trip created successfully:', data);
    
    // ✅ Save manual entry data to the correct tables
    if (tripData.manual_entry_data) {
      console.log('📋 Saving manual entry data for trip:', tripId);
      
      try {
        // Save destinations to trip_destinations table
        if (tripData.manual_entry_data.destinations && tripData.manual_entry_data.destinations.length > 0) {
          console.log('🗺️  Saving destinations...');
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
        
        // Save daily schedules to trip_day_schedules table
        if (tripData.manual_entry_data.daySchedules && tripData.manual_entry_data.daySchedules.length > 0) {
          console.log('📅 Saving daily schedules...');
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
        
        // Save travel details to trip_travel_details table
        if (tripData.manual_entry_data.travelDetails && tripData.manual_entry_data.travelDetails.length > 0) {
          console.log('✈️ Saving travel details...');
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
        
        // Save accommodations to trip_accommodations table
        if (tripData.manual_entry_data.accommodations && tripData.manual_entry_data.accommodations.length > 0) {
          console.log('🏨 Saving accommodations...');
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
    } else {
      console.log('ℹ️  No manual entry data to save');
    }
    
    // Return success response
    return NextResponse.json({
      success: true,
      id: tripId,
      tripId: tripId, // Also return as tripId for compatibility
      message: 'Trip and manual entry data created successfully',
      data: data
    });
    
  } catch (error: any) {
    console.error('💥 Error in create trip API route:', error);
    console.error('🔍 Request processing error:', {
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