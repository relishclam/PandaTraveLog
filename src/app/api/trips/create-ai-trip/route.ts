import { NextRequest, NextResponse } from 'next/server';
import supabase from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { trip, itinerary, aiContext } = await request.json();

    if (!trip || !trip.user_id) {
      return NextResponse.json({ error: 'Trip data and user_id are required' }, { status: 400 });
    }

    // Validate required trip fields
    const requiredFields = ['title', 'destination', 'start_date', 'end_date', 'user_id'];
    for (const field of requiredFields) {
      if (!trip[field]) {
        return NextResponse.json({ error: `Missing required field: ${field}` }, { status: 400 });
      }
    }

    // Create the main trip record
    const tripRecord = {
      id: trip.id,
      user_id: trip.user_id,
      title: trip.title,
      destination: trip.destination,
      start_date: trip.start_date,
      end_date: trip.end_date,
      description: trip.description || 'AI-generated trip via PO Assistant',
      status: trip.status || 'planning',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Insert trip into database
    const { data: tripData, error: tripError } = await supabase
      .from('trips')
      .insert(tripRecord)
      .select()
      .single();

    if (tripError) {
      console.error('Trip creation error:', tripError);
      return NextResponse.json({ 
        error: 'Failed to create trip in database', 
        details: tripError.message 
      }, { status: 500 });
    }

    // Create itinerary entries if provided
    if (itinerary && Array.isArray(itinerary) && itinerary.length > 0) {
      const itineraryRecords = itinerary.map((day, index) => ({
        id: `${trip.id}-day-${day.day || index + 1}`,
        trip_id: tripData.id,
        user_id: trip.user_id,
        day_number: day.day || index + 1,
        date: day.date,
        title: `Day ${day.day || index + 1}`,
        description: day.activities ? day.activities.join(', ') : '',
        activities: day.activities || [],
        accommodation: day.accommodation || null,
        notes: day.notes || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));

      const { error: itineraryError } = await supabase
        .from('itineraries')
        .insert(itineraryRecords);

      if (itineraryError) {
        console.error('Itinerary creation error:', itineraryError);
        // Don't fail the entire request, just log the error
      }
    }

    // Store AI chat context for future reference (optional)
    if (aiContext && Array.isArray(aiContext)) {
      const chatRecord = {
        id: `${trip.id}-chat-context`,
        trip_id: tripData.id,
        user_id: trip.user_id,
        chat_messages: aiContext,
        created_at: new Date().toISOString()
      };

      // This would require a separate table for chat contexts
      // For now, we'll skip this and just focus on the core trip creation
    }

    return NextResponse.json({
      success: true,
      tripId: tripData.id,
      trip: tripData,
      message: 'AI trip created successfully'
    });

  } catch (error) {
    console.error('Create AI Trip API Error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to create AI trip', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}
