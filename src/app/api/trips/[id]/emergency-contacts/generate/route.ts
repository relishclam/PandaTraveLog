/**
 * API endpoint to generate AI-powered emergency contacts for a trip
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import EmergencyContactsAI from '@/services/emergency-contacts-ai';

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

    // Get trip details and all diary data
    const { data: trip, error: tripError } = await supabase
      .from('trips')
      .select('destination, country, user_id, manual_entry_data')
      .eq('id', tripId)
      .eq('user_id', user.id)
      .single();

    if (tripError || !trip) {
      return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
    }

    // Extract accommodation and transport details from trip diary
    const [accommodations, travelDetails] = await Promise.all([
      supabase
        .from('trip_accommodations')
        .select('*')
        .eq('trip_id', tripId),
      supabase
        .from('trip_travel_details')
        .select('*')
        .eq('trip_id', tripId)
    ]);

    console.log('📍 Extracted trip diary data:', {
      accommodations: accommodations.data?.length || 0,
      travelDetails: travelDetails.data?.length || 0,
      manualEntryData: !!trip.manual_entry_data
    });

    // Initialize AI service
    const emergencyContactsAI = new EmergencyContactsAI();

    // Generate emergency contacts from trip diary data
    const emergencyInfo = await emergencyContactsAI.generateEmergencyContactsFromDiary(
      trip.destination,
      trip.country,
      accommodations.data || [],
      travelDetails.data || [],
      trip.manual_entry_data
    );

    // Save generated contacts to database
    const contactsToInsert = emergencyInfo.contacts.map((contact: { name: string; phone: string; type: string; notes?: string }) => ({
      user_id: user.id,
      name: contact.name,
      phone: contact.phone,
      relationship: contact.type,
      notes: contact.notes || '',
      is_ai_generated: true,
      ai_confidence: emergencyInfo.confidence,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));

    // Insert contacts (only if they don't already exist)
    const { data: existingContacts } = await supabase
      .from('travel_contacts')
      .select('phone')
      .eq('user_id', user.id);

    const existingPhones = new Set(existingContacts?.map((c: any) => c.phone) || []);
    const newContacts = contactsToInsert.filter(contact => 
      !existingPhones.has(contact.phone)
    );

    if (newContacts.length > 0) {
      const { error: insertError } = await supabase
        .from('travel_contacts')
        .insert(newContacts);

      if (insertError) {
        console.error('Error inserting AI-generated contacts:', insertError);
        return NextResponse.json(
          { error: 'Failed to save emergency contacts' }, 
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      emergencyInfo,
      newContactsAdded: newContacts.length,
      totalContacts: emergencyInfo.contacts.length
    });

  } catch (error) {
    console.error('Error generating emergency contacts:', error);
    return NextResponse.json(
      { error: 'Failed to generate emergency contacts' }, 
      { status: 500 }
    );
  }
}

export async function GET(
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

    // Get existing AI-generated contacts for this user
    const { data: contacts, error } = await supabase
      .from('travel_contacts')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_ai_generated', true);

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch contacts' }, { status: 500 });
    }

    return NextResponse.json({ contacts });

  } catch (error) {
    console.error('Error fetching AI-generated contacts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch emergency contacts' }, 
      { status: 500 }
    );
  }
}
