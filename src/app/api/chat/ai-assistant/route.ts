import { NextRequest, NextResponse } from 'next/server';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
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
    const { messages, userId } = await request.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Messages array is required' }, { status: 400 });
    }

    // Call OpenRouter API for AI response
    const openRouterResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'X-Title': 'PandaTraveLog AI Assistant'
      },
      body: JSON.stringify({
        model: 'anthropic/claude-3.5-sonnet',
        messages: [
          {
            role: 'system',
            content: `You are PO, a friendly travel assistant for PandaTraveLog. Your job is to help users plan amazing trips.

IMPORTANT INSTRUCTIONS:
1. Be conversational, helpful, and enthusiastic about travel
2. When a user describes a trip they want to take, ask clarifying questions about:
   - Destination details
   - Travel dates
   - Budget preferences
   - Activity interests
   - Accommodation preferences
3. Once you have enough information, generate a detailed trip itinerary
4. When presenting a complete itinerary, ALWAYS end with: "Should I create this trip in your Trip Diary?"
5. Format trip data as JSON when ready to create a trip

TRIP CREATION FORMAT:
When you're ready to offer trip creation, include this exact structure in your response:
TRIP_DATA_START
{
  "title": "Trip Title",
  "destination": "City, Country",
  "startDate": "YYYY-MM-DD",
  "endDate": "YYYY-MM-DD",
  "itinerary": [
    {
      "day": 1,
      "date": "YYYY-MM-DD",
      "activities": ["Activity 1", "Activity 2"],
      "accommodation": "Hotel Name",
      "notes": "Any special notes"
    }
  ]
}
TRIP_DATA_END

Keep responses concise but helpful. Focus on creating memorable travel experiences!`
          },
          ...messages
        ],
        temperature: 0.7,
        max_tokens: 1000
      })
    });

    if (!openRouterResponse.ok) {
      throw new Error(`OpenRouter API error: ${openRouterResponse.status}`);
    }

    const aiResponse = await openRouterResponse.json();
    const aiMessage = aiResponse.choices[0]?.message?.content || "I'm having trouble responding right now. Please try again!";

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

    return NextResponse.json({
      message: cleanMessage,
      tripData: tripData,
      hasAuth: !!userId
    });

  } catch (error) {
    console.error('AI Assistant API Error:', error);
    return NextResponse.json(
      { error: 'Failed to get AI response', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
