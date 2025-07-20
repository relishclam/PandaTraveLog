import { NextRequest, NextResponse } from 'next/server';
import supabase from '@/lib/supabase';

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
    const { messages, userId, tripId, context, conversationId } = await request.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Messages array is required' }, { status: 400 });
    }

    // Get context-aware system prompt
    const systemPrompt = getContextualSystemPrompt(context, tripId, userId);

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

    // Check if the response contains trip data
    let tripData: TripData | null = null;
    const tripDataMatch = aiMessage.match(/TRIP_DATA_START\s*([\s\S]*?)\s*TRIP_DATA_END/);
    
    if (tripDataMatch) {
      try {
        tripData = JSON.parse(tripDataMatch[1].trim());
      } catch (error) {
        console.error('Error parsing trip data:', error);
      }
    }

    // Clean the message (remove trip data markers)
    const cleanMessage = aiMessage.replace(/TRIP_DATA_START[\s\S]*?TRIP_DATA_END/g, '').trim();

    // Save conversation to database if user is authenticated
    let savedConversationId = conversationId;
    if (userId) {
      savedConversationId = await saveConversation(
        userId, 
        tripId, 
        context, 
        [...messages, { role: 'assistant', content: cleanMessage, timestamp: new Date() }],
        conversationId
      );
    }

    return NextResponse.json({
      message: cleanMessage,
      tripData: tripData,
      conversationId: savedConversationId,
      hasAuth: !!userId
    });

  } catch (error) {
    console.error('PO Chat API Error:', error);
    return NextResponse.json(
      { error: 'Failed to get AI response', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

function getContextualSystemPrompt(context: string, tripId?: string, userId?: string): string {
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
${tripId ? `- This conversation is about trip ID: ${tripId}` : ''}
- The user is viewing their trip diary and may need help with:
  * Adding activities or places to visit
  * Finding restaurants or accommodations
  * Getting local tips and cultural insights
  * Modifying their existing itinerary
  * Transportation and logistics questions
  * Budget-friendly alternatives
- Reference their existing trip details when possible
- Provide specific, actionable suggestions with details
- Help optimize their current plans`,

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