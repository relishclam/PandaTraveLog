// src/services/ai-diary-generator.ts
import { supabaseAdmin } from '../lib/supabase-admin';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface GeneratedItineraryItem {
  day_number: number;
  date: string;
  title: string;
  description: string;
  activity_type: 'sightseeing' | 'dining' | 'accommodation' | 'transport' | 'activity' | 'shopping' | 'other';
  location?: string;
  start_time?: string;
  end_time?: string;
  estimated_cost?: number;
  notes?: string;
}

interface GeneratedTripDiary {
  trip_title: string;
  destination: string;
  start_date: string;
  end_date: string;
  total_days: number;
  itinerary: GeneratedItineraryItem[];
  budget_estimate?: {
    total: number;
    currency: string;
    breakdown: {
      accommodation: number;
      food: number;
      transport: number;
      activities: number;
      other: number;
    };
  };
}

export class AIDiaryGenerator {
  /**
   * Extract trip information and itinerary from PO Assistant conversation
   */
  static async generateTripDiaryFromConversation(
    conversation: ChatMessage[],
    userId: string
  ): Promise<GeneratedTripDiary | null> {
    try {
      // Prepare conversation text for AI analysis
      const conversationText = conversation
        .map(msg => `${msg.role.toUpperCase()}: ${msg.content}`)
        .join('\n\n');

      // Call OpenRouter API to extract structured trip data
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPEN_ROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000',
          'X-Title': 'PandaTraveLog AI Diary Generator'
        },
        body: JSON.stringify({
          model: 'anthropic/claude-3.5-sonnet',
          messages: [
            {
              role: 'system',
              content: `You are an expert travel itinerary analyzer. Extract structured trip information from the conversation below and format it as a detailed travel diary.

REQUIREMENTS:
1. Extract trip title, destination, dates, and duration
2. Create detailed daily itinerary with activities, locations, and timing
3. Categorize activities: sightseeing, dining, accommodation, transport, activity, shopping, other
4. Estimate costs where mentioned or reasonable
5. Include practical notes and tips
6. Format as valid JSON matching the GeneratedTripDiary interface

IMPORTANT: 
- Only extract information that was actually discussed in the conversation
- If dates aren't specified, use reasonable estimates based on itinerary length
- Include estimated costs in local currency when possible
- Make activities specific and actionable

Return ONLY valid JSON, no additional text.`
            },
            {
              role: 'user',
              content: `Please analyze this travel conversation and extract a structured trip diary:\n\n${conversationText}`
            }
          ],
          temperature: 0.3,
          max_tokens: 2000
        })
      });

      if (!response.ok) {
        throw new Error(`OpenRouter API error: ${response.statusText}`);
      }

      const data = await response.json();
      const aiResponse = data.choices[0]?.message?.content;

      if (!aiResponse) {
        throw new Error('No response from AI service');
      }

      // Parse the JSON response
      let tripDiary: GeneratedTripDiary;
      try {
        // Clean the response in case there's extra text
        const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
        const jsonString = jsonMatch ? jsonMatch[0] : aiResponse;
        tripDiary = JSON.parse(jsonString);
      } catch (parseError) {
        console.error('Failed to parse AI response:', aiResponse);
        throw new Error('Invalid JSON response from AI service');
      }

      // Validate the structure
      if (!tripDiary.trip_title || !tripDiary.destination || !tripDiary.itinerary) {
        throw new Error('Invalid trip diary structure');
      }

      return tripDiary;
    } catch (error) {
      console.error('Error generating trip diary from conversation:', error);
      return null;
    }
  }

  /**
   * Save generated trip diary to database
   */
  static async saveTripDiary(
    tripDiary: GeneratedTripDiary,
    userId: string,
    conversationId?: string
  ): Promise<string | null> {
    try {
      // Create the trip record
      const { data: trip, error: tripError } = await supabaseAdmin
        .from('trips')
        .insert({
          id: crypto.randomUUID(),
          user_id: userId,
          name: tripDiary.trip_title,
          destination: tripDiary.destination,
          start_date: tripDiary.start_date,
          end_date: tripDiary.end_date,
          status: 'planned',
          created_from: 'ai_assistant',
          ai_conversation_id: conversationId
        })
        .select('id')
        .single();

      if (tripError || !trip) {
        throw new Error(`Failed to create trip: ${tripError?.message}`);
      }

      // Save itinerary items
      const itineraryItems = tripDiary.itinerary.map(item => ({
        id: crypto.randomUUID(),
        trip_id: trip.id,
        day_number: item.day_number,
        date: item.date,
        title: item.title,
        description: item.description,
        activity_type: item.activity_type,
        location: item.location,
        start_time: item.start_time,
        end_time: item.end_time,
        estimated_cost: item.estimated_cost,
        notes: item.notes,
        created_at: new Date().toISOString()
      }));

      const { error: itineraryError } = await supabaseAdmin
        .from('trip_itinerary')
        .insert(itineraryItems);

      if (itineraryError) {
        // Clean up the trip if itinerary creation fails
        await supabaseAdmin.from('trips').delete().eq('id', trip.id);
        throw new Error(`Failed to save itinerary: ${itineraryError.message}`);
      }

      // Save budget information if provided
      if (tripDiary.budget_estimate) {
        const { error: budgetError } = await supabaseAdmin
          .from('trip_budgets')
          .insert({
            id: crypto.randomUUID(),
            trip_id: trip.id,
            total_budget: tripDiary.budget_estimate.total,
            currency: tripDiary.budget_estimate.currency,
            accommodation_budget: tripDiary.budget_estimate.breakdown.accommodation,
            food_budget: tripDiary.budget_estimate.breakdown.food,
            transport_budget: tripDiary.budget_estimate.breakdown.transport,
            activities_budget: tripDiary.budget_estimate.breakdown.activities,
            other_budget: tripDiary.budget_estimate.breakdown.other
          });

        if (budgetError) {
          console.warn('Failed to save budget information:', budgetError.message);
          // Don't fail the entire operation for budget errors
        }
      }

      return trip.id;
    } catch (error) {
      console.error('Error saving trip diary:', error);
      return null;
    }
  }

  /**
   * Get conversation history for a specific trip
   */
  static async getTripConversation(tripId: string, userId: string): Promise<ChatMessage[]> {
    try {
      const { data: messages, error } = await supabaseAdmin
        .from('assistant_conversations')
        .select('*')
        .eq('trip_id', tripId)
        .eq('user_id', userId)
        .order('created_at', { ascending: true });

      if (error) {
        throw new Error(`Failed to fetch conversation: ${error.message}`);
      }

      return messages.map((msg: any) => ({
        id: msg.id,
        role: msg.role as 'user' | 'assistant',
        content: msg.message,
        timestamp: new Date(msg.created_at)
      }));
    } catch (error) {
      console.error('Error fetching trip conversation:', error);
      return [];
    }
  }

  /**
   * Check if a trip was created from AI conversation
   */
  static async isAIGeneratedTrip(tripId: string): Promise<boolean> {
    try {
      const { data: trip, error } = await supabaseAdmin
        .from('trips')
        .select('created_from')
        .eq('id', tripId)
        .single();

      if (error || !trip) {
        return false;
      }

      return trip.created_from === 'ai_assistant';
    } catch (error) {
      console.error('Error checking trip origin:', error);
      return false;
    }
  }
}
