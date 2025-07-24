import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
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
    const tripId = params.id;

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { type, data } = await request.json();

    console.log(`📝 Writing to trip diary: ${type}`, { tripId, userId: user.id });

    // Verify trip ownership
    const { data: trip, error: tripError } = await supabase
      .from('trips')
      .select('id, user_id')
      .eq('id', tripId)
      .eq('user_id', user.id)
      .single();

    if (tripError || !trip) {
      return NextResponse.json({ error: 'Trip not found or access denied' }, { status: 404 });
    }

    let result = null;

    switch (type) {
      case 'itinerary_item':
        // Add new itinerary item
        const { error: itineraryError } = await supabase
          .from('trip_itinerary')
          .insert({
            id: crypto.randomUUID(),
            trip_id: tripId,
            day_number: data.day_number,
            title: data.title,
            description: data.description,
            activity_type: data.activity_type || 'activity',
            location: data.location,
            start_time: data.start_time,
            end_time: data.end_time,
            estimated_cost: data.estimated_cost,
            notes: data.notes,
            created_at: new Date().toISOString()
          });

        if (itineraryError) throw itineraryError;
        result = { type: 'itinerary_item', message: 'Itinerary item added successfully' };
        break;

      case 'accommodation':
        // Add new accommodation
        const { error: accommodationError } = await supabase
          .from('trip_accommodations')
          .insert({
            id: crypto.randomUUID(),
            trip_id: tripId,
            name: data.name,
            address: data.address,
            check_in_date: data.check_in_date,
            check_out_date: data.check_out_date,
            contact_info: data.contact_info,
            notes: data.notes,
            created_at: new Date().toISOString()
          });

        if (accommodationError) throw accommodationError;
        result = { type: 'accommodation', message: 'Accommodation added successfully' };
        break;

      case 'travel_detail':
        // Add new travel detail
        const { error: travelError } = await supabase
          .from('trip_travel_details')
          .insert({
            id: crypto.randomUUID(),
            trip_id: tripId,
            mode: data.mode,
            departure_location: data.departure_location,
            arrival_location: data.arrival_location,
            departure_date: data.departure_date,
            departure_time: data.departure_time,
            arrival_time: data.arrival_time,
            booking_reference: data.booking_reference,
            contact_info: data.contact_info,
            details: data.details,
            created_at: new Date().toISOString()
          });

        if (travelError) throw travelError;
        result = { type: 'travel_detail', message: 'Travel detail added successfully' };
        break;

      case 'companion':
        // Add new companion
        const { error: companionError } = await supabase
          .from('trip_companions')
          .insert({
            id: crypto.randomUUID(),
            trip_id: tripId,
            name: data.name,
            relationship: data.relationship,
            contact_info: data.contact_info,
            emergency_contact: data.emergency_contact || false,
            notes: data.notes,
            created_at: new Date().toISOString()
          });

        if (companionError) throw companionError;
        result = { type: 'companion', message: 'Companion added successfully' };
        break;

      case 'multiple_items':
        // Add multiple items in a transaction
        const insertPromises = [];

        if (data.itinerary_items) {
          const itineraryItems = data.itinerary_items.map((item: any) => ({
            id: crypto.randomUUID(),
            trip_id: tripId,
            day_number: item.day_number,
            title: item.title,
            description: item.description,
            activity_type: item.activity_type || 'activity',
            location: item.location,
            start_time: item.start_time,
            end_time: item.end_time,
            estimated_cost: item.estimated_cost,
            notes: item.notes,
            created_at: new Date().toISOString()
          }));

          insertPromises.push(
            supabase.from('trip_itinerary').insert(itineraryItems)
          );
        }

        if (data.accommodations) {
          const accommodations = data.accommodations.map((acc: any) => ({
            id: crypto.randomUUID(),
            trip_id: tripId,
            name: acc.name,
            address: acc.address,
            check_in_date: acc.check_in_date,
            check_out_date: acc.check_out_date,
            contact_info: acc.contact_info,
            notes: acc.notes,
            created_at: new Date().toISOString()
          }));

          insertPromises.push(
            supabase.from('trip_accommodations').insert(accommodations)
          );
        }

        if (data.travel_details) {
          const travelDetails = data.travel_details.map((travel: any) => ({
            id: crypto.randomUUID(),
            trip_id: tripId,
            mode: travel.mode,
            departure_location: travel.departure_location,
            arrival_location: travel.arrival_location,
            departure_date: travel.departure_date,
            departure_time: travel.departure_time,
            arrival_time: travel.arrival_time,
            booking_reference: travel.booking_reference,
            contact_info: travel.contact_info,
            details: travel.details,
            created_at: new Date().toISOString()
          }));

          insertPromises.push(
            supabase.from('trip_travel_details').insert(travelDetails)
          );
        }

        // Execute all inserts
        const results = await Promise.all(insertPromises);
        const errors = results.filter(r => r.error);
        
        if (errors.length > 0) {
          throw new Error(`Failed to insert some items: ${errors.map(e => e.error?.message).join(', ')}`);
        }

        result = { 
          type: 'multiple_items', 
          message: 'Multiple items added successfully',
          counts: {
            itinerary_items: data.itinerary_items?.length || 0,
            accommodations: data.accommodations?.length || 0,
            travel_details: data.travel_details?.length || 0
          }
        };
        break;

      default:
        return NextResponse.json({ error: 'Invalid write type' }, { status: 400 });
    }

    console.log(`✅ Successfully wrote to diary:`, result);

    return NextResponse.json({
      success: true,
      result
    });

  } catch (error) {
    console.error('❌ Error writing to trip diary:', error);
    return NextResponse.json(
      { error: 'Failed to write to trip diary' },
      { status: 500 }
    );
  }
}
