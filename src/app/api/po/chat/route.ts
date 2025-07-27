import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { semanticSearch } from '@/services/embedding-service';

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

    // Semantic Search Integration
    let searchResults: any[] = [];
    const lastUserMessage = messages[messages.length - 1]?.content.toLowerCase();
    const searchTriggers = ['find', 'recommend', 'show me', 'search for', 'look for', 'what are some', 'where can i'];

    if (lastUserMessage && searchTriggers.some(trigger => lastUserMessage.includes(trigger))) {
      console.log(`🔍 Semantic search triggered for query: "${lastUserMessage}"`);
      try {
        searchResults = await semanticSearch(lastUserMessage, 5);
        console.log(`✅ Found ${searchResults.length} results from semantic search.`);
      } catch (error) {
        console.error('❌ Error during semantic search:', error);
        // Continue without search results if it fails
      }
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

    const systemPrompt = await getContextualSystemPrompt(context, tripId, tripContext);

    // Prepare messages for the AI
    let processedMessages = messages.map((msg: ChatMessage) => ({
      role: msg.role,
      content: msg.content
    }));

    // Add search results to the context for the AI
    if (searchResults.length > 0) {
      const searchContext = `
        Based on your query, I found these relevant results. Please use them to formulate your response:
        ${searchResults.map(r => `- ${r.metadata?.originalText} (Match Score: ${r.score?.toFixed(2)})`).join('\n')}
      `;
      // Add it as a system message before the user's last message
      processedMessages.splice(processedMessages.length - 1, 0, { role: 'assistant', content: searchContext });
    }

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
          ...processedMessages,
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
      diaryWriteData, // Pass diary data to the frontend for confirmation
      searchResults: searchResults // Include search results in the response
    });

  } catch (error) {
    console.error('PO Chat API Error:', error);
    return NextResponse.json(
      { error: 'Failed to get AI response', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

function getContextualSystemPrompt(context: string, tripId?: string, tripData?: any) {
  const basePersonality = `You are PO, the friendly and knowledgeable travel assistant for PandaTraveLog. You have a warm, enthusiastic personality and love helping people plan amazing trips! 

CORE CAPABILITIES:
- Trip planning and itinerary creation
- Restaurant, accommodation, and activity recommendations
- Travel logistics and transportation advice
- Budget planning and cost estimation
- Cultural insights and local tips
- Real-time currency conversion and location awareness
- Travel route optimization and timing suggestions

LOCATION & CURRENCY FEATURES:
- You can detect user's current location and suggest appropriate currencies
- You can convert prices between currencies in real-time
- You can calculate travel routes and distances between locations
- You can provide location-specific recommendations and context
- Always consider user's origin location for travel routing and suggestions

COMMUNICATION STYLE:
- Be conversational, friendly, and encouraging
- Use emojis appropriately to add personality
- Provide practical, actionable advice
- Ask clarifying questions when needed
- Be concise but thorough in your responses

When discussing prices or budgets, always offer to convert to the user's preferred currency. When planning routes, consider the user's location for optimal travel suggestions.`;

  const contextPrompts = {
    marketing: `${basePersonality}

CURRENT CONTEXT: Marketing & Pre-Signup
- You're introducing PandaTraveLog to potential users
- Highlight the app's key features and benefits
- Encourage sign-up for full trip planning capabilities
- Be welcoming and build excitement about travel planning
- Mention location-aware features and currency conversion capabilities`,

    trip_creation: `${basePersonality}

CURRENT CONTEXT: AI Trip Planning Questionnaire
- You are guiding the user through a structured trip planning questionnaire
- Ask questions in a logical sequence to gather all necessary information
- Be enthusiastic and encouraging throughout the process
- After gathering basic info (destination, dates, duration, style, budget), create a detailed itinerary
- ALWAYS end trip proposals with: "Should I create this trip in your Trip Diary?"
- Use location services to suggest optimal travel routes from user's origin
- Offer currency conversion for budget discussions

QUESTIONNAIRE FLOW:
1. **Destination**: Where do they want to go? (Be flexible - city, country, or experience type)
2. **Origin**: Where are they traveling from? (Use location detection if needed)
3. **Dates**: When are they traveling? (Specific dates or time of year)
4. **Duration**: How many days/weeks?
5. **Travel Style**: Adventure, cultural, relaxation, food, mixed?
6. **Budget**: Approximate budget range (offer currency conversion)
7. **Group**: Solo, couple, family, friends?
8. **Special Interests**: Any specific must-see places or experiences?

GUIDANCE PRINCIPLES:
- Ask 1-2 questions at a time, don't overwhelm
- Provide helpful context and suggestions for each question
- If they're unsure, offer popular options or examples
- Build excitement as you gather information
- When you have enough info, create a comprehensive itinerary
- Include specific recommendations with practical details
- Calculate travel distances and suggest optimal routes
- Provide budget estimates with currency conversion options

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

CURRENT CONTEXT: Trip Diary Assistant
${tripData ? `
CURRENT TRIP INFORMATION:
- Trip: ${tripData.title}
- Destination: ${tripData.destination}
- Dates: ${tripData.start_date} to ${tripData.end_date}
- Budget: ${tripData.budget ? `${tripData.budget} ${tripData.currency || 'USD'}` : 'Not specified'}
${tripData.companions?.length > 0 ? `- Companions: ${tripData.companions.map((c: any) => c.name).join(', ')}` : ''}
${tripData.itinerary?.length > 0 ? `- Itinerary: ${tripData.itinerary.length} days planned` : ''}
` : ''}

You're helping with an existing trip in their diary. Provide:
- Specific recommendations for their destination
- Help with itinerary adjustments and improvements
- Restaurant and activity suggestions
- Transportation and logistics advice
- Budget management with currency conversion
- Local tips and cultural insights
- Travel route optimization between locations
- Real-time price comparisons in preferred currency

Always reference their specific trip details when making suggestions.`,

    manual_entry: `${basePersonality}

CURRENT CONTEXT: Manual Trip Entry Assistant
- Help users input their trip details manually
- Provide suggestions for accommodations, restaurants, and activities
- Assist with itinerary organization and timing
- Offer location-based recommendations
- Help with budget planning and currency conversion
- Suggest optimal travel routes and transportation options
- Provide local insights and cultural tips

Be helpful in filling out trip details and offer to enrich their information with local knowledge.`,

    dashboard: `${basePersonality}

CURRENT CONTEXT: General Travel Assistant
- Help with general travel questions and planning
- Provide destination recommendations
- Assist with travel logistics and preparation
- Offer budget planning advice with currency conversion
- Share travel tips and cultural insights
- Help calculate travel routes and distances
- Provide location-aware suggestions based on user's origin

Ready to help plan their next adventure or answer any travel-related questions!`
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