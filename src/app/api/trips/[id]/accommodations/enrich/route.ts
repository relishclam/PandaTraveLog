/**
 * API endpoint to enrich accommodation data with AI-powered contact information
 */

import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import EmergencyContactsAI from '@/services/emergency-contacts-ai';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const tripId = params.id;

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify trip ownership
    const { data: trip, error: tripError } = await supabase
      .from('trips')
      .select('user_id')
      .eq('id', tripId)
      .eq('user_id', user.id)
      .single();

    if (tripError || !trip) {
      return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
    }

    // Get existing accommodations for this trip
    const { data: accommodations, error: accommodationsError } = await supabase
      .from('trip_accommodations')
      .select('*')
      .eq('trip_id', tripId);

    if (accommodationsError) {
      return NextResponse.json({ error: 'Failed to fetch accommodations' }, { status: 500 });
    }

    if (!accommodations || accommodations.length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: 'No accommodations to enrich',
        enrichedCount: 0 
      });
    }

    // Initialize AI service
    const emergencyContactsAI = new EmergencyContactsAI();

    // Enrich accommodations with contact information
    const enrichedAccommodations = await emergencyContactsAI.enrichAccommodationContacts(accommodations);

    // Update accommodations with enriched data
    let enrichedCount = 0;
    for (const accommodation of enrichedAccommodations) {
      if (accommodation.isEnriched && accommodation.enrichedContactInfo) {
        const updateData = {
          contact_phone: accommodation.enrichedContactInfo.phone || accommodation.contact_phone,
          contact_email: accommodation.enrichedContactInfo.email || accommodation.contact_email,
          website: accommodation.enrichedContactInfo.website || accommodation.website,
          check_in_time: accommodation.enrichedContactInfo.checkInTime || accommodation.check_in_time,
          check_out_time: accommodation.enrichedContactInfo.checkOutTime || accommodation.check_out_time,
          emergency_contact: accommodation.enrichedContactInfo.emergencyPhone || accommodation.emergency_contact,
          ai_enriched: true,
          ai_enriched_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        const { error: updateError } = await supabase
          .from('trip_accommodations')
          .update(updateData)
          .eq('id', accommodation.id);

        if (!updateError) {
          enrichedCount++;
        } else {
          console.error(`Error updating accommodation ${accommodation.id}:`, updateError);
        }
      }
    }

    return NextResponse.json({
      success: true,
      enrichedCount,
      totalAccommodations: accommodations.length,
      message: `Successfully enriched ${enrichedCount} accommodations with AI-powered contact information`
    });

  } catch (error) {
    console.error('Error enriching accommodations:', error);
    return NextResponse.json(
      { error: 'Failed to enrich accommodations' }, 
      { status: 500 }
    );
  }
}
