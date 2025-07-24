import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    console.log('=== PO Assistant Chat API Called ===');
    
    const { message, context, tripId, userId, conversationHistory } = await request.json();
    console.log('Received chat request:', { message, context, tripId, userId, historyLength: conversationHistory?.length || 0 });
    
    // Validate required fields
    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }
    
    // Create Supabase client for user context
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
        .select('title, destination, start_date, end_date, description, status')
        .eq('id', tripId)
        .eq('user_id', currentUserId)
        .single();
      tripContext = trip;
    }

    // Get or create conversation history from database
    let conversationMessages = [];
    if (currentUserId) {
      // Try to get existing conversation history
      const { data: existingHistory } = await supabase
        .from('assistant_conversations')
        .select('messages, updated_at')
        .eq('user_id', currentUserId)
        .eq('context', context || 'general')
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();

      if (existingHistory && existingHistory.messages) {
        conversationMessages = existingHistory.messages;
        console.log('Retrieved conversation history:', conversationMessages.length, 'messages');
      }
    }

    // If client provided conversation history, use that instead (for immediate context)
    if (conversationHistory && Array.isArray(conversationHistory)) {
      conversationMessages = conversationHistory;
      console.log('Using client-provided conversation history:', conversationMessages.length, 'messages');
    }
    
    // Build context for AI
    const systemPrompt = buildSystemPrompt(userProfile, tripContext, context);
    
    // Get OpenRouter API key (using same logic as existing services)
    const effectiveApiKey = process.env.OPENROUTER_API_KEY || process.env.OPEN_ROUTER_API_KEY || process.env.NEXT_PUBLIC_OPEN_ROUTER_API_KEY;
    
    if (!effectiveApiKey) {
      console.error('OpenRouter API key is missing for PO Assistant, using fallback responses');
      // Provide fallback response instead of failing
      const fallbackResponse = getFallbackResponse(message, context, tripContext);
      return NextResponse.json({
        message: fallbackResponse.message,
        emotion: fallbackResponse.emotion,
        suggestedActions: generateSuggestedActions(context, tripContext, fallbackResponse.message),
        context: {
          tripId,
          userProfile: userProfile?.name,
          tripName: tripContext?.title,
          fallback: true
        }
      });
    }
    
    console.log('Using OpenRouter API key for PO Assistant:', !!effectiveApiKey);
    
    // Call OpenRouter API
    const openRouterResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${effectiveApiKey}`,
        'Content-Type': 'application/json',
        'X-Title': 'PandaTraveLog PO Assistant',
        'HTTP-Referer': 'https://pandatravelog.netlify.app',
      },
      body: JSON.stringify({
        model: 'anthropic/claude-3.5-sonnet',
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          // Include conversation history
          ...conversationMessages.slice(-10), // Keep last 10 messages for context
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
    
    // Generate suggested actions
    const suggestedActions = generateSuggestedActions(context, tripContext, assistantMessage);
    
    // Update conversation history in database
    if (currentUserId) {
      const updatedHistory = [
        ...conversationMessages.slice(-8), // Keep last 8 messages + new ones = 10 total
        { role: 'user', content: message, timestamp: new Date().toISOString() },
        { role: 'assistant', content: assistantMessage, timestamp: new Date().toISOString() }
      ];

      // Upsert conversation history
      await supabase
        .from('assistant_conversations')
        .upsert({
          user_id: currentUserId,
          context: context || 'general',
          messages: updatedHistory,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,context'
        });
      
      console.log('Updated conversation history with', updatedHistory.length, 'messages');
    }
    
    console.log('PO Assistant response generated successfully');
    
    return NextResponse.json({
      message: assistantMessage,
      emotion,
      suggestedActions,
      conversationHistory: conversationMessages.concat([
        { role: 'user', content: message, timestamp: new Date().toISOString() },
        { role: 'assistant', content: assistantMessage, timestamp: new Date().toISOString() }
      ]),
      context: {
        tripId,
        userProfile: userProfile?.name,
        tripName: tripContext?.title
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
- Trip: ${tripContext.title}
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

function getFallbackResponse(message: string, context: string, tripContext: any): {message: string, emotion: string} {
  const lowerMessage = message.toLowerCase();
  
  // Context-based fallback responses
  if (context === 'trip_creation') {
    if (lowerMessage.includes('destination') || lowerMessage.includes('place')) {
      return {
        message: "🐼 I'd love to help you choose destinations! Consider what type of experience you want - beaches, cities, mountains, or cultural sites. What interests you most?",
        emotion: 'excited'
      };
    }
    if (lowerMessage.includes('date') || lowerMessage.includes('when')) {
      return {
        message: "🗓️ Great question! Consider factors like weather, local events, and your schedule. Peak seasons offer more activities but higher prices. What time of year works best for you?",
        emotion: 'thinking'
      };
    }
    return {
      message: "🎯 I'm here to help with your trip planning! I can assist with destinations, dates, activities, and organizing your itinerary. What would you like to focus on first?",
      emotion: 'happy'
    };
  }
  
  if (context === 'trip_diary') {
    return {
      message: "📝 I can help you organize your trip diary! Try adding daily activities, noting important details, or planning your schedule. What would you like to work on?",
      emotion: 'curious'
    };
  }
  
  // General travel advice
  if (lowerMessage.includes('help') || lowerMessage.includes('how')) {
    return {
      message: "🐼 I'm PO, your travel companion! I can help with trip planning, destination advice, itinerary organization, and using this app. What specific help do you need?",
      emotion: 'happy'
    };
  }
  
  if (lowerMessage.includes('thailand') || lowerMessage.includes('japan') || lowerMessage.includes('europe')) {
    return {
      message: "🌍 Great destination choice! I'd recommend researching the best time to visit, must-see attractions, local customs, and transportation options. Would you like help planning your itinerary?",
      emotion: 'excited'
    };
  }
  
  // Default helpful response
  return {
    message: "🐼 I'm here to help with your travel planning! Feel free to ask me about destinations, itineraries, travel tips, or how to use this app. What can I assist you with?",
    emotion: 'happy'
  };
}
