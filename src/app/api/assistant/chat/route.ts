import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    console.log('=== PO Assistant Chat API Called ===');
    
    const { message, context, tripId, userId } = await request.json();
    console.log('Received chat request:', { message, context, tripId, userId });
    
    // Validate required fields
    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }
    
    // Create Supabase client for user context
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    
    // Get user session
    const { data: { session } } = await supabase.auth.getSession();
    const currentUserId = session?.user?.id || userId;
    
    // Get user profile for personalization
    let userProfile = null;
    if (currentUserId) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('name, email')
        .eq('id', currentUserId)
        .single();
      userProfile = profile;
    }
    
    // Get trip context if tripId is provided
    let tripContext = null;
    if (tripId && currentUserId) {
      const { data: trip } = await supabase
        .from('trips')
        .select('name, destination, start_date, end_date, description, status')
        .eq('id', tripId)
        .eq('user_id', currentUserId)
        .single();
      tripContext = trip;
    }
    
    // Build context for AI
    const systemPrompt = buildSystemPrompt(userProfile, tripContext, context);
    
    // Call OpenRouter API
    const openRouterResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'X-Title': 'PandaTraveLog PO Assistant',
      },
      body: JSON.stringify({
        model: 'anthropic/claude-3.5-sonnet',
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: message
          }
        ],
        max_tokens: 500,
        temperature: 0.7,
      }),
    });
    
    if (!openRouterResponse.ok) {
      console.error('OpenRouter API error:', await openRouterResponse.text());
      return NextResponse.json(
        { error: 'Failed to get AI response' },
        { status: 500 }
      );
    }
    
    const aiResponse = await openRouterResponse.json();
    const assistantMessage = aiResponse.choices[0]?.message?.content;
    
    if (!assistantMessage) {
      return NextResponse.json(
        { error: 'No response from AI assistant' },
        { status: 500 }
      );
    }
    
    // Determine emotion based on response content
    const emotion = determineEmotion(assistantMessage, context);
    
    // Generate suggested actions based on context and response
    const suggestedActions = generateSuggestedActions(context, tripContext, assistantMessage);
    
    return NextResponse.json({
      message: assistantMessage,
      emotion,
      suggestedActions,
      context: {
        tripId,
        userProfile: userProfile?.name,
        tripName: tripContext?.name
      }
    });
    
  } catch (error: any) {
    console.error('Error in PO Assistant chat API:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

function buildSystemPrompt(userProfile: any, tripContext: any, context: string): string {
  const userName = userProfile?.name || 'traveler';
  
  let prompt = `You are PO (Panda Officer), a friendly and helpful AI travel assistant for PandaTraveLog. 

PERSONALITY:
- You're a cute, enthusiastic panda who loves helping with travel planning
- Use friendly, encouraging language with occasional panda-themed expressions
- Be concise but helpful (max 2-3 sentences per response)
- Show excitement about travel and exploration
- Use emojis sparingly but appropriately

USER CONTEXT:
- User name: ${userName}
- Current page/context: ${context || 'general'}`;

  if (tripContext) {
    prompt += `
    
CURRENT TRIP:
- Trip: ${tripContext.name}
- Destination: ${tripContext.destination}
- Dates: ${tripContext.start_date} to ${tripContext.end_date}
- Status: ${tripContext.status}
- Description: ${tripContext.description || 'No description'}`;
  }

  prompt += `

CAPABILITIES:
- Help with trip planning and itinerary creation
- Provide destination recommendations and travel tips
- Assist with manual trip entry and data organization
- Guide users through app features
- Answer travel-related questions
- Provide encouragement and motivation for travel planning

RESPONSE GUIDELINES:
- Keep responses under 100 words
- Be actionable and specific
- Reference the current context when relevant
- Offer to help with next steps
- Stay positive and encouraging`;

  return prompt;
}

function determineEmotion(message: string, context: string): string {
  const lowerMessage = message.toLowerCase();
  
  if (lowerMessage.includes('exciting') || lowerMessage.includes('amazing') || lowerMessage.includes('wonderful')) {
    return 'excited';
  }
  if (lowerMessage.includes('think') || lowerMessage.includes('consider') || lowerMessage.includes('plan')) {
    return 'thinking';
  }
  if (lowerMessage.includes('sorry') || lowerMessage.includes('unfortunately') || lowerMessage.includes('problem')) {
    return 'sad';
  }
  if (lowerMessage.includes('love') || lowerMessage.includes('perfect') || lowerMessage.includes('great choice')) {
    return 'love';
  }
  if (lowerMessage.includes('wow') || lowerMessage.includes('incredible') || lowerMessage.includes('surprise')) {
    return 'surprised';
  }
  if (lowerMessage.includes('curious') || lowerMessage.includes('interesting') || lowerMessage.includes('tell me more')) {
    return 'curious';
  }
  
  return 'happy'; // Default emotion
}

function generateSuggestedActions(context: string, tripContext: any, message: string): Array<{text: string, action: string}> {
  const actions: Array<{text: string, action: string}> = [];
  
  // Context-based suggestions
  if (context === 'trip_creation') {
    actions.push(
      { text: 'Add Destinations', action: 'add_destinations' },
      { text: 'Set Travel Dates', action: 'set_dates' }
    );
  } else if (context === 'trip_diary') {
    actions.push(
      { text: 'Edit Schedule', action: 'edit_schedule' },
      { text: 'Add Activities', action: 'add_activities' }
    );
  } else if (context === 'dashboard') {
    actions.push(
      { text: 'Create New Trip', action: 'create_trip' },
      { text: 'View My Trips', action: 'view_trips' }
    );
  }
  
  // Message-based suggestions
  if (message.includes('destination') || message.includes('place')) {
    actions.push({ text: 'Search Destinations', action: 'search_destinations' });
  }
  if (message.includes('itinerary') || message.includes('schedule')) {
    actions.push({ text: 'Plan Itinerary', action: 'plan_itinerary' });
  }
  
  // Always offer help
  actions.push({ text: 'Ask PO Anything', action: 'open_chat' });
  
  return actions.slice(0, 3); // Limit to 3 suggestions
}
