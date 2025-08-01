import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const getSupabaseClient = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!url || !key) {
    throw new Error('Missing Supabase environment variables');
  }
  
  return createClient(url, key);
};

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = getSupabaseClient();
    const { id: tripId } = await params;
    
    console.log('Extracting contacts for trip:', tripId);
    
    // Fetch trip data including accommodations, travel details, and itinerary
    const [tripResult, accommodationsResult, travelResult, itineraryResult] = await Promise.all([
      supabase.from('trips').select('*').eq('id', tripId).single(),
      supabase.from('trip_accommodations').select('*').eq('trip_id', tripId),
      supabase.from('trip_travel_details').select('*').eq('trip_id', tripId),
      supabase.from('trip_itinerary').select('*').eq('trip_id', tripId)
    ]);

    if (tripResult.error) {
      console.error('Trip fetch error:', tripResult.error);
      throw tripResult.error;
    }
    
    const trip = tripResult.data;
    const accommodations = accommodationsResult.data || [];
    const travelDetails = travelResult.data || [];
    const itinerary = itineraryResult.data || [];
    
    console.log('Trip data:', { trip: trip?.title, accommodations: accommodations.length, travelDetails: travelDetails.length, itinerary: itinerary.length });
    
    // Extract contacts from trip data
    const extractedContacts = [];
    
    // Extract accommodation contacts
    for (const accommodation of accommodations) {
      if (accommodation.name && (accommodation.phone || accommodation.contact_info)) {
        extractedContacts.push({
          name: accommodation.name,
          phone: accommodation.phone || extractPhoneFromText(accommodation.contact_info),
          type: 'accommodation',
          address: accommodation.address,
          notes: `Hotel: ${accommodation.name}${accommodation.booking_reference ? ` - Booking: ${accommodation.booking_reference}` : ''}`,
          priority: 2
        });
      }
    }
    
    // Extract travel contacts (airlines, car rentals, etc.)
    for (const travel of travelDetails) {
      if (travel.provider && (travel.contact_phone || travel.booking_reference)) {
        extractedContacts.push({
          name: travel.provider,
          phone: travel.contact_phone || extractPhoneFromText(travel.notes),
          type: 'transportation',
          notes: `${travel.mode || 'Travel'}: ${travel.provider}${travel.booking_reference ? ` - Booking: ${travel.booking_reference}` : ''}`,
          priority: 2
        });
      }
    }
    
    // Extract contacts from itinerary items (restaurants, attractions with phone numbers)
    for (const item of itinerary) {
      if (item.location && item.notes) {
        const phone = extractPhoneFromText(item.notes);
        if (phone) {
          extractedContacts.push({
            name: item.title || item.location,
            phone: phone,
            type: 'local_service',
            address: item.location,
            notes: `${item.activity_type || 'Activity'}: ${item.title}`,
            priority: 3
          });
        }
      }
    }
    
    // Add destination-specific emergency numbers using OpenRouter AI
    try {
      const emergencyNumbers = await generateDestinationEmergencyContacts(trip.destination);
      extractedContacts.push(...emergencyNumbers);
    } catch (error) {
      console.warn('Failed to generate AI emergency contacts:', error);
      // Continue without AI-generated contacts
    }
    
    console.log('Extracted contacts:', extractedContacts.length);
    
    // Check which contacts already exist to avoid duplicates
    const existingContacts = await supabase
      .from('travel_contacts')
      .select('phone, name')
      .eq('user_id', trip.user_id);
    
    const existingPhones = new Set(
      (existingContacts.data || []).map(c => normalizePhone(c.phone))
    );
    
    // Filter out duplicates and save new contacts
    const newContacts = extractedContacts.filter(contact => 
      contact.phone && !existingPhones.has(normalizePhone(contact.phone))
    );
    
    console.log('New contacts to add:', newContacts.length);
    
    let savedContacts = [];
    
    for (const contact of newContacts) {
      try {
        const { data, error } = await supabase
          .from('travel_contacts')
          .insert({
            user_id: trip.user_id,
            name: contact.name,
            phone: contact.phone,
            relationship: contact.type,
            address: contact.address,
            notes: contact.notes,
            priority: contact.priority || 3
          })
          .select()
          .single();
        
        if (!error && data) {
          savedContacts.push(data);
        } else if (error) {
          console.error('Error saving contact:', error);
        }
      } catch (contactError) {
        console.error('Error inserting contact:', contactError);
      }
    }
    
    console.log('Saved contacts:', savedContacts.length);
    
    return NextResponse.json({
      success: true,
      extractedContacts: extractedContacts.length,
      newContactsAdded: savedContacts.length,
      contacts: savedContacts,
      debug: {
        tripId,
        accommodations: accommodations.length,
        travelDetails: travelDetails.length,
        itinerary: itinerary.length,
        extractedTotal: extractedContacts.length,
        newTotal: newContacts.length,
        savedTotal: savedContacts.length
      }
    });
    
  } catch (error) {
    console.error('Contact extraction error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to extract contacts from trip data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Helper function to extract phone numbers from text
function extractPhoneFromText(text: string): string | null {
  if (!text) return null;
  
  // Enhanced regex to match various phone number formats
  const phoneRegex = /(\+?[\d\s\-\(\)\.]{8,})/g;
  const matches = text.match(phoneRegex);
  
  if (matches && matches.length > 0) {
    // Return the first phone number found, cleaned up
    const cleaned = matches[0].replace(/[^\d+]/g, '');
    // Only return if it has at least 8 digits
    return cleaned.length >= 8 ? cleaned : null;
  }
  
  return null;
}

// Helper function to normalize phone numbers for comparison
function normalizePhone(phone: string): string {
  if (!phone) return '';
  return phone.replace(/[^\d]/g, '');
}

// Generate destination-specific emergency contacts using AI
async function generateDestinationEmergencyContacts(destination: string) {
  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'X-Title': 'PandaTraveLog Emergency Contacts'
      },
      body: JSON.stringify({
        model: 'anthropic/claude-3.5-sonnet',
        messages: [
          {
            role: 'system',
            content: `You are a travel safety expert. Generate essential emergency contact numbers for ${destination}. Include police, medical, fire, tourist police, and embassy contacts with real phone numbers. Format as JSON array with objects containing: name, phone, type, priority (1-3, 1 being highest).`
          },
          {
            role: 'user',
            content: `Generate emergency contacts for ${destination}. Include local emergency services, tourist police, and relevant embassy/consulate numbers. Provide real, working phone numbers.`
          }
        ],
        temperature: 0.1,
        max_tokens: 1000
      })
    });
    
    if (!response.ok) {
      throw new Error(`AI service error: ${response.status}`);
    }
    
    const data = await response.json();
    const content = data.choices[0].message.content;
    
    // Parse the AI response to extract emergency contacts
    try {
      const emergencyContacts = JSON.parse(content);
      return emergencyContacts.map((contact: any) => ({
        name: contact.name,
        phone: contact.phone,
        type: contact.type || 'emergency_services',
        priority: contact.priority || 1,
        notes: `Emergency service for ${destination}`
      }));
    } catch (parseError) {
      console.error('Failed to parse AI emergency contacts:', parseError);
      return [];
    }
    
  } catch (error) {
    console.error('Failed to generate emergency contacts:', error);
    return [];
  }
}
