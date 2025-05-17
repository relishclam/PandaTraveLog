import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize the Gemini API with the API key
const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY || '');

export type TripRecommendationRequest = {
  destination: string;
  startDate?: string;
  endDate?: string;
  interests?: string[];
  budget?: string;
  travelStyle?: string;
};

export type PlaceRecommendation = {
  name: string;
  description: string;
  category: string;
  recommendedTime?: string;
  estimatedCost?: string;
  tips?: string;
};

export type ItineraryDay = {
  day: number;
  morning: PlaceRecommendation[];
  lunch: PlaceRecommendation[];
  afternoon: PlaceRecommendation[];
  dinner: PlaceRecommendation[];
  evening?: PlaceRecommendation[];
  tips: string;
};

export type GeneratedItinerary = {
  destination: string;
  summary: string;
  days: ItineraryDay[];
};

/**
 * Generates place recommendations for a given destination
 */
export async function generatePlaceRecommendations(
  destination: string,
  count: number = 10
): Promise<PlaceRecommendation[]> {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
    
    const prompt = `
      I'm planning a trip to ${destination}. Please suggest ${count} interesting places to visit.
      For each place, provide:
      1. Name
      2. Brief description (1-2 sentences)
      3. Category (e.g., Historical, Nature, Entertainment, etc.)
      4. Recommended time to spend there
      5. Estimated cost (Budget, Moderate, Expensive)
      
      Format the response as a JSON array with objects containing:
      {
        "name": "Place Name",
        "description": "Brief description",
        "category": "Category",
        "recommendedTime": "Time to spend",
        "estimatedCost": "Cost category",
        "tips": "A useful tip for visitors"
      }
    `;
    
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    
    // Extract JSON from the response
    const jsonMatch = text.match(/\\[\\s\\S]*?\\]/);
    if (!jsonMatch) {
      throw new Error('Failed to parse recommendations from AI response');
    }
    
    // Parse the JSON array of recommendations
    const recommendations = JSON.parse(jsonMatch[0]) as PlaceRecommendation[];
    return recommendations;
  } catch (error) {
    console.error('Error generating place recommendations:', error);
    throw error;
  }
}

/**
 * Generates a complete trip itinerary
 */
export async function generateTripItinerary(
  request: TripRecommendationRequest
): Promise<GeneratedItinerary> {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
    
    // Calculate trip duration
    let duration = 3; // Default to 3 days
    if (request.startDate && request.endDate) {
      const start = new Date(request.startDate);
      const end = new Date(request.endDate);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      duration = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }
    
    let interestsText = '';
    if (request.interests && request.interests.length > 0) {
      interestsText = `My interests include: ${request.interests.join(', ')}.`;
    }
    
    let budgetText = '';
    if (request.budget) {
      budgetText = `My budget is approximately ${request.budget}.`;
    }
    
    let travelStyleText = '';
    if (request.travelStyle) {
      travelStyleText = `My travel style is ${request.travelStyle}.`;
    }
    
    const prompt = `
      Create a detailed ${duration}-day travel itinerary for ${request.destination}.
      ${interestsText}
      ${budgetText}
      ${travelStyleText}
      
      For each day, provide:
      1. Morning activities with specific places to visit
      2. Lunch recommendation
      3. Afternoon activities with specific places
      4. Dinner recommendation
      5. Evening activities (if appropriate)
      6. A local travel tip for the day
      
      Format the response as a JSON object with:
      {
        "destination": "${request.destination}",
        "summary": "Brief summary of the trip plan",
        "days": [
          {
            "day": 1,
            "morning": [{"name": "Place Name", "description": "Description", "category": "Category"}],
            "lunch": [{"name": "Restaurant Name", "description": "Description", "category": "Cuisine"}],
            "afternoon": [{"name": "Place Name", "description": "Description", "category": "Category"}],
            "dinner": [{"name": "Restaurant Name", "description": "Description", "category": "Cuisine"}],
            "evening": [{"name": "Place Name", "description": "Description", "category": "Category"}],
            "tips": "Useful tip for the day"
          }
        ]
      }
    `;
    
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    
    // Extract JSON from the response
    const jsonMatch = text.match(/{\\s*"destination"[\\s\\S]*?}/);
    if (!jsonMatch) {
      throw new Error('Failed to parse itinerary from AI response');
    }
    
    // Parse the JSON object
    const itinerary = JSON.parse(jsonMatch[0]) as GeneratedItinerary;
    return itinerary;
  } catch (error) {
    console.error('Error generating trip itinerary:', error);
    throw error;
  }
}

/**
 * Get AI assistant response to a user query about a destination
 */
export async function getAssistantResponse(
  destination: string,
  query: string
): Promise<string> {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
    
    const prompt = `
      I'm planning a trip to ${destination} and I want to know about the following:
      "${query}"
      
      Please provide a helpful, conversational response as if you are PO, a friendly travel panda assistant.
      Keep your answer concise (under 150 words) but informative and enthusiastic. End with a follow-up question
      or suggestion to help continue planning the trip.
    `;
    
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (error) {
    console.error('Error getting assistant response:', error);
    throw error;
  }
}
