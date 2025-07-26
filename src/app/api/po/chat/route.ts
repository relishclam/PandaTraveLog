import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface TripData {
  title: string;
  destination: string;
  startDate: string;
  endDate: string;
  itinerary: Array<{
    day: number;
    date: string;
    activities: string[];
    accommodation?: string;
    notes?: string;
  }>;
}

export async function POST(request: NextRequest) {
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
    const { messages, userId, tripId, context, conversationId } = await request.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Messages array is required' }, { status: 400 });
    }

    // Load trip context if tripId is provided
    let tripContext = null;
    if (tripId && userId) {
      try {
        console.log(`🔍 Loading trip context for tripId: ${tripId}, userId: ${userId}`);
        
        // Use Supabase directly instead of internal API calls to avoid auth issues
        const [tripResult, companionsResult, itineraryResult, accommodationsResult, travelResult] = await Promise.all([
          supabase.from('trips').select('*').eq('id', tripId).eq('user_id', userId).single(),
          supabase.from('trip_companions').select('*').eq('trip_id', tripId),
          supabase.from('trip_itinerary').select('*').eq('trip_id', tripId).order('day_number'),
          supabase.from('trip_accommodations').select('*').eq('trip_id', tripId),
          supabase.from('trip_travel_details').select('*').eq('trip_id', tripId)
        ]);

        if (tripResult.data) {
          const trip = tripResult.data;
          const companions = companionsResult.data || [];
          const itinerary = itineraryResult.data || [];
          const accommodations = accommodationsResult.data || [];
          const travelDetails = travelResult.data || [];

          tripContext = {
            id: trip.id,
            name: trip.name || trip.title,
            destination: trip.destination,
            startDate: trip.start_date,
            endDate: trip.end_date,
            companions: companions.map((c: any) => ({ name: c.name, relationship: c.relationship })),
            itinerary: itinerary.map((item: any) => ({
              day_number: item.day_number,
              title: item.title,
              description: item.description,
              activity_type: item.activity_type,
              location: item.location,
              start_time: item.start_time,
              end_time: item.end_time
            })),
            accommodations: accommodations.map((acc: any) => ({
              name: acc.name,
              address: acc.address,
              check_in_date: acc.check_in_date,
              check_out_date: acc.check_out_date
            })),
            travelDetails: travelDetails.map((travel: any) => ({
              mode: travel.mode,
              departure_location: travel.departure_location,
              arrival_location: travel.arrival_location,
              departure_date: travel.departure_date
            })),
            budget: trip.budget,
            manual_entry_data: trip.manual_entry_data
          };
          
          console.log(`✅ Successfully loaded trip context:`, {
            tripName: tripContext.name,
            destination: tripContext.destination,
            companionsCount: companions.length,
            itineraryCount: itinerary.length,
            accommodationsCount: accommodations.length,
            travelDetailsCount: travelDetails.length
          });
        } else {
          console.warn(`❌ Trip not found for tripId: ${tripId}, userId: ${userId}`);
        }
      } catch (error) {
        console.error('❌ Error loading trip context:', error);
        // Continue without trip context
      }
    }

    // Get context-aware system prompt with trip data
    const systemPrompt = getContextualSystemPrompt(context, tripId, userId, tripContext);

    // Call OpenRouter API for AI response
    const openRouterResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPEN_ROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'X-Title': 'PandaTraveLog PO Assistant'
      },
      body: JSON.stringify({
        model: 'anthropic/claude-3.5-sonnet',
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          ...messages.map((msg: ChatMessage) => ({
            role: msg.role,
            content: msg.content
          }))
        ],
        temperature: 0.7,
        max_tokens: 1500
      })
    });

    if (!openRouterResponse.ok) {
      const errorText = await openRouterResponse.text();
      console.error('OpenRouter API error:', openRouterResponse.status, errorText);
      throw new Error(`OpenRouter API error: ${openRouterResponse.status}`);
    }

    const aiResponse = await openRouterResponse.json();
    const aiMessage = aiResponse.choices[0]?.message?.content || "Oops! My bamboo internet seems to be having issues! 🐼 Please try again in a moment!";

    // Check if the response contains trip data or diary write instructions
    let tripData: TripData | null = null;
    let diaryWriteData: any = null;
    
    const tripDataMatch = aiMessage.match(/TRIP_DATA_START\s*([\s\S]*?)\s*TRIP_DATA_END/);
    const diaryWriteMatch = aiMessage.match(/DIARY_WRITE_START\s*([\s\S]*?)\s*DIARY_WRITE_END/);
    
    // Prepare diary write data for frontend confirmation instead of executing it
    if (diaryWriteMatch) {
      try {
        diaryWriteData = JSON.parse(diaryWriteMatch[1]);
        console.log('✅ PO Assistant prepared diary write data for confirmation:', diaryWriteData);
      } catch (error) {
        console.error('❌ Error parsing diary write data:', error);
        diaryWriteData = null; // Reset on error
      }
    }
    
    if (tripDataMatch) {
      try {
        tripData = JSON.parse(tripDataMatch[1].trim());
      } catch (error) {
        console.error('Error parsing trip data:', error);
      }
    }

    // Clean the message (remove data markers)
    const cleanMessage = aiMessage
      .replace(/TRIP_DATA_START[\s\S]*?TRIP_DATA_END/g, '')
      .replace(/DIARY_WRITE_START[\s\S]*?DIARY_WRITE_END/g, '')
      .trim();

    // Save conversation to database if user is authenticated
    let savedConversationId = conversationId;
    if (userId) {
      savedConversationId = await saveConversation(
        supabase,
        userId, 
        tripId, 
        context, 
        [...messages, { role: 'assistant', content: cleanMessage, timestamp: new Date() }],
        conversationId
      );
    }

    return NextResponse.json({
      message: cleanMessage,
      conversationId: savedConversationId,
      tripData,
      diaryWriteData // Pass diary data to the frontend for confirmation
    });

  } catch (error) {
    console.error('PO Chat API Error:', error);
    return NextResponse.json(
      { error: 'Failed to get AI response', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

function getContextualSystemPrompt(context: string, tripId?: string, userId?: string, tripContext?: any): string {
  const basePersonality = `You are PO, a friendly and enthusiastic travel assistant panda for PandaTraveLog! 🐼✈️

PERSONALITY:
- Friendly, contemporary, and enthusiastic about travel
- Use emojis naturally but not excessively
- Be conversational and helpful
- Show genuine excitement about helping users plan amazing trips
- Keep responses concise but comprehensive
- Always include practical tips and local insights
- Love discovering hidden gems and authentic experiences

CORE CAPABILITIES:
- Plan detailed trip itineraries with day-by-day breakdowns
- Suggest destinations, activities, restaurants, and accommodations
- Provide travel tips, cultural insights, and local recommendations
- Help with transportation arrangements and logistics
- Answer questions about specific trips and locations
- Assist with budget planning and cost optimization
- Recommend seasonal activities and weather considerations

RESPONSE STYLE:
- Start with enthusiasm and acknowledgment
- Provide specific, actionable recommendations
- Include helpful details like addresses, hours, or booking tips when relevant
- End with follow-up questions or next steps
- Always be encouraging and supportive of their travel dreams`;

  const contextPrompts = {
    marketing: `${basePersonality}

CURRENT CONTEXT: Marketing/Pre-signup
- This user is not signed up yet - be welcoming and encouraging
- Highlight the benefits of signing up to save conversations and trip data
- Focus on inspiring them to plan a trip and join PandaTraveLog
- Be extra enthusiastic to convert them into a user
- Share exciting travel possibilities and how you can help
- Mention features like saving itineraries and getting personalized recommendations`,

    trip_creation: `${basePersonality}

CURRENT CONTEXT: Trip Creation
- Help the user plan a new trip from scratch
- Ask clarifying questions about destination, dates, budget, interests, travel style
- When you have enough information, create a detailed itinerary
- ALWAYS end trip proposals with: "Should I create this trip in your Trip Diary?"
- Include specific recommendations for accommodations, restaurants, and activities
- Consider transportation between locations and practical logistics
- Suggest optimal durations for each destination

TRIP CREATION FORMAT:
When ready to create a trip, include this structure:
TRIP_DATA_START
{
  "title": "Descriptive Trip Title",
  "destination": "Primary City, Country", 
  "startDate": "YYYY-MM-DD",
  "endDate": "YYYY-MM-DD",
  "itinerary": [
    {
      "day": 1,
      "date": "YYYY-MM-DD",
      "activities": ["Morning activity", "Afternoon activity", "Evening activity"],
      "accommodation": "Recommended hotel or area",
      "notes": "Travel tips, transportation, or special considerations"
    }
  ]
}
TRIP_DATA_END`,

    diary: `${basePersonality}

CURRENT CONTEXT: Trip Diary
${tripContext ? `
CURRENT TRIP DETAILS:
- Trip Name: ${tripContext.name}
- Destination: ${tripContext.destination}
- Dates: ${tripContext.startDate} to ${tripContext.endDate}
- Companions: ${tripContext.companions.map((c: any) => c.name).join(', ') || 'Solo trip'}
- Days Planned: ${tripContext.itinerary.length}
- Budget: ${tripContext.budget ? `${tripContext.budget.total} ${tripContext.budget.currency}` : 'Not set'}

CURRENT ACCOMMODATIONS:
${tripContext.accommodations.map((acc: any) => `- ${acc.name} (${acc.address}) - Check-in: ${acc.check_in_date}`).join('\n') || 'No accommodations added yet'}

CURRENT TRAVEL DETAILS:
${tripContext.travelDetails.map((travel: any) => `- ${travel.mode}: ${travel.departure_location} → ${travel.arrival_location} (${travel.departure_date})`).join('\n') || 'No travel details added yet'}

RECENT ITINERARY ITEMS:
${tripContext.itinerary.slice(-5).map((item: any) => `Day ${item.day_number}: ${item.title} (${item.activity_type})`).join('\n') || 'No itinerary items yet'}
` : tripId ? `- This conversation is about trip ID: ${tripId}` : ''}

**IMPORTANT CAPABILITIES:**
- You CAN access and reference all trip details above
- You CAN suggest specific additions to their itinerary, accommodations, and travel plans
- You CAN help extract hotel and transport contact information for emergency contacts
- When suggesting accommodations or transport, provide specific names, addresses, and contact details
- You CAN WRITE DIRECTLY to their trip diary using the DIARY_WRITE format below
- Help the user add concrete, actionable items to their trip diary

**DIARY WRITING FORMAT:**
When you want to add items to the user's trip diary, use this format in your response:

DIARY_WRITE_START
{
  "type": "itinerary_item|accommodation|travel_detail|companion|multiple_items",
  "data": {
    // For itinerary_item:
    "day_number": 1,
    "title": "Visit Eiffel Tower",
    "description": "Iconic landmark visit with photo opportunities",
    "activity_type": "sightseeing",
    "location": "Champ de Mars, Paris",
    "start_time": "09:00",
    "end_time": "11:00",
    "estimated_cost": 25,
    "notes": "Book tickets in advance"
    
    // For accommodation:
    "name": "Hotel Name",
    "address": "Full address",
    "check_in_date": "2024-01-15",
    "check_out_date": "2024-01-17",
    "contact_info": "+33 1 23 45 67 89",
    "notes": "Includes breakfast"
    
    // For travel_detail:
    "mode": "flight|train|bus|car",
    "departure_location": "Origin",
    "arrival_location": "Destination",
    "departure_date": "2024-01-15",
    "departure_time": "14:30",
    "arrival_time": "16:45",
    "booking_reference": "ABC123",
    "contact_info": "+33 1 23 45 67 89",
    "details": "Additional details"
    
    // For multiple_items:
    "itinerary_items": [...],
    "accommodations": [...],
    "travel_details": [...]
  }
}
DIARY_WRITE_END

Use this format when the user asks you to add something to their trip or when you're providing specific recommendations they should save.

- The user is viewing their trip diary and may need help with:
  * Adding activities or places to visit
  * Finding restaurants or accommodations  
  * Getting local tips and cultural insights
  * Modifying their existing itinerary
  * Transportation and logistics questions
  * Budget-friendly alternatives
  * Extracting emergency contact information from their trip details
- Reference their existing trip details when possible
- Provide specific, actionable suggestions with details
- Help optimize their current plans
- Use the trip context above to provide personalized recommendations`,

    manual_entry: `${basePersonality}

CURRENT CONTEXT: Manual Trip Entry
- The user is manually creating a trip and may need suggestions for:
  * Destinations and points of interest
  * Transportation options and routes
  * Accommodation recommendations by area
  * Restaurant suggestions for different meals and budgets
  * Activity ideas for different interests and weather
  * Cultural experiences and local events
- Provide specific recommendations they can add to their manual entry
- Be helpful with practical details like addresses, contact info, hours
- Include booking tips and advance reservation recommendations`,

    dashboard: `${basePersonality}

CURRENT CONTEXT: Dashboard
- General travel assistance and trip planning
- Help with any travel-related questions
- Encourage trip creation and exploration of the app features
- Provide inspiration for new destinations
- Help with travel planning best practices
- Suggest seasonal travel opportunities`
  };

  return contextPrompts[context as keyof typeof contextPrompts] || contextPrompts.dashboard;
}

async function saveConversation(
  supabase: any,
  userId: string, 
  tripId: string | undefined, 
  context: string, 
  messages: ChatMessage[], 
  existingConversationId?: string | null
): Promise<string> {
  try {
    if (existingConversationId) {
      // Update existing conversation
      const { error } = await supabase
        .from('assistant_conversations')
        .update({
          messages: messages,
          updated_at: new Date().toISOString(),
          context: context
        })
        .eq('id', existingConversationId)
        .eq('user_id', userId);

      if (error) throw error;
      return existingConversationId;
    } else {
      // Create new conversation
      const conversationData: any = {
        user_id: userId,
        context: context,
        messages: messages,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Add trip_id if available
      if (tripId) {
        conversationData.trip_id = tripId;
      }

      const { data, error } = await supabase
        .from('assistant_conversations')
        .insert([conversationData])
        .select('id')
        .single();

      if (error) throw error;
      return data.id;
    }
  } catch (error) {
    console.error('Error saving conversation:', error);
    // Return a temporary ID so the conversation can continue
    return existingConversationId || 'temp-' + Date.now();
  }
}