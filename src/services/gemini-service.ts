// src/services/gemini-service.ts
// Now using OpenRouter API instead of Gemini
import axios from 'axios';

export interface TripDetails {
  title: string;
  startDate: string;
  endDate: string;
  duration: number;
  budget?: string;
  notes?: string;
  mainDestination: string;
  allDestinations: string[];
}

export interface GeminiResponse {
  success: boolean;
  itineraryOptions?: ItineraryOption[];
  finalItinerary?: Itinerary;
  error?: string;
}

export interface ItineraryOption {
  id: string;
  title: string;
  description: string;
  highlights: string[];
  days: ItineraryDayOption[];
}

export interface ItineraryDayOption {
  dayNumber: number;
  title: string;
  description: string;
  activities: ActivityOption[];
  meals?: string[];
}

export interface ActivityOption {
  id: string;
  title: string;
  description: string;
  type: 'sightseeing' | 'adventure' | 'relaxation' | 'cultural' | 'culinary' | 'other';
  location: string;
  placeId?: string;
  imageUrl?: string;
  rating?: number;
  duration?: string;
  cost?: string;
  isSelected?: boolean;
  dayNumber?: number;
}

export interface Itinerary {
  id: string;
  title: string;
  description: string;
  days: ItineraryDay[];
}

export interface ItineraryDay {
  dayNumber: number;
  date: string;
  title: string;
  description: string;
  activities: Activity[];
  meals: {
    breakfast?: Meal;
    lunch?: Meal;
    dinner?: Meal;
  };
}

export interface Activity {
  id: string;
  title: string;
  description: string;
  type: string;
  location: {
    name: string;
    address?: string;
    placeId?: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };
  startTime?: string;
  endTime?: string;
  duration?: string;
  imageUrl?: string;
  mapUrl?: string;
  cost?: string;
  notes?: string;
}

export interface Meal {
  name: string;
  location?: string;
  description?: string;
  placeId?: string;
}

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

// Renamed but keeping the same name in exports to minimize changes elsewhere in the codebase
export const geminiService = {
  /**
   * Generate initial itinerary options based on trip details
   */
  generateItineraryOptions: async (tripDetails: TripDetails): Promise<GeminiResponse> => {
    try {
      console.log('Generating itinerary options with Gemini API for:', tripDetails);
    
    // Validate and fix trip duration
    if (tripDetails.duration <= 0) {
      console.warn('Invalid trip duration detected:', tripDetails.duration);
      let duration = 3; // Default to 3 days
      if (tripDetails.startDate && tripDetails.endDate) {
        const start = new Date(tripDetails.startDate);
        const end = new Date(tripDetails.endDate);
        const diffTime = Math.abs(end.getTime() - start.getTime());
        duration = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        // Ensure minimum duration of 1 day
        duration = Math.max(1, duration);
        
        console.log('Trip duration calculation:', { 
          startDate: tripDetails.startDate, 
          endDate: tripDetails.endDate, 
          start: start.toISOString(), 
          end: end.toISOString(), 
          diffTime, 
          calculatedDuration: duration 
        });
      }
      tripDetails.duration = duration;
      console.log('Fixed trip duration:', tripDetails.duration);
    }
    
    // Validate start and end dates
    const startDate = new Date(tripDetails.startDate);
    const endDate = new Date(tripDetails.endDate);
    console.log('Date validation:', {
      startDateValid: !isNaN(startDate.getTime()),
      endDateValid: !isNaN(endDate.getTime()),
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString()
    });
      // Try server-side key first, then fall back to client-side key if necessary
      const apiKey = process.env.OPEN_ROUTER_API_KEY || process.env.NEXT_PUBLIC_OPEN_ROUTER_API_KEY;
      
      console.log('OPEN_ROUTER_API_KEY available:', !!process.env.OPEN_ROUTER_API_KEY);
      console.log('NEXT_PUBLIC_OPEN_ROUTER_API_KEY available:', !!process.env.NEXT_PUBLIC_OPEN_ROUTER_API_KEY);
      console.log('Combined API Key available:', !!apiKey, apiKey ? `(length: ${apiKey.length})` : '');
      
      if (!apiKey) {
        console.error('OpenRouter API key is missing');
        return {
          success: false,
          error: 'API key is missing. Please check your environment configuration.'
        };
      }

      // Craft a detailed prompt for the OpenRouter API
      const isOneDayTrip = tripDetails.duration === 1;
      console.log(`Creating ${isOneDayTrip ? 'one-day' : 'multi-day'} trip prompt`);
      
      // Create appropriate title and description templates based on trip type
      const planType = isOneDayTrip ? '3 different day plans' : '3 different itinerary options';
      const dateFormat = isOneDayTrip 
        ? `On ${tripDetails.startDate}` 
        : `From ${tripDetails.startDate} to ${tripDetails.endDate}`;
      const durationUnit = isOneDayTrip ? 'day' : 'days';
      const oneDayNote = isOneDayTrip 
        ? '- This is a ONE-DAY trip, so focus on creating diverse day plans that make the most of a single day.' 
        : '';
        
      const prompt = `
        As a travel planning AI, create ${planType} for a trip to ${tripDetails.mainDestination}.
        
        Trip details:
        - Title: ${tripDetails.title}
        - Duration: ${tripDetails.duration} ${durationUnit}
        - Dates: ${dateFormat}
        - Budget: ${tripDetails.budget || 'Not specified'}
        ${tripDetails.notes ? `- Special notes: ${tripDetails.notes}` : ''}
        ${oneDayNote}
        
        ${tripDetails.allDestinations.length > 1 
          ? `This is a multi-destination trip including: ${tripDetails.allDestinations.join(', ')}` 
          : `This trip focuses on ${tripDetails.mainDestination}`
        }
        
        For each itinerary option, provide:
        1. A catchy title and brief description
        2. A list of highlights
        3. A day-by-day breakdown with activities
        
        Format your response as a valid JSON object with this structure:
        {
          "itineraryOptions": [
            {
              "id": "option1",
              "title": "Adventurous Exploration",
              "description": "Brief summary of this itinerary style",
              "highlights": ["Highlight 1", "Highlight 2", "Highlight 3"],
              "days": [
                {
                  "dayNumber": 1,
                  "title": "Day 1: Arrival and City Exploration",
                  "description": "Brief summary of the day",
                  "activities": [
                    {
                      "id": "act1",
                      "title": "Activity Name",
                      "description": "Brief description",
                      "type": "sightseeing",
                      "location": "Location name",
                      "duration": "2 hours",
                      "cost": "$20"
                    }
                  ],
                  "meals": ["Restaurant suggestion for breakfast", "Restaurant suggestion for lunch", "Restaurant suggestion for dinner"]
                }
              ]
            }
          ]
        }
        
        ${isOneDayTrip ? `For one-day trips, focus on creating a full day with morning, afternoon, and evening activities. 
        Suggest 4-6 activities that can realistically fit in a single day while allowing for travel time between locations.
        Make sure the title reflects a one-day adventure like "Morning to Evening Adventure" or "Full Day Exploration".
        The day title should be something like "Full Day Itinerary" rather than "Day 1: Arrival".` : ''}
        
        Include a variety of activities (sightseeing, adventure, relaxation, cultural, culinary) and ensure each day has 3-5 activities.
        For activity types, only use these categories: sightseeing, adventure, relaxation, cultural, culinary, other.
      `;

      const response = await axios.post(
        OPENROUTER_API_URL,
        {
          model: 'openai/gpt-4o', // Using GPT-4o for high-quality itinerary generation
          messages: [
            {
              role: 'system',
              content: 'You are a travel planning AI assistant that creates detailed itineraries in valid JSON format. Always structure your response exactly as requested.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          response_format: { type: 'json_object' }, // Enforcing JSON response format
          temperature: 0.7,
          max_tokens: 8192,
          top_p: 0.95,
        },
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'HTTP-Referer': 'https://pandatravelog.netlify.app', // Your site URL for attribution
            'X-Title': 'PandaTraveLog', // Your site name for attribution
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('OpenRouter API response received');
      
      // Extract the response text from OpenRouter format
      const responseText = response.data.choices[0].message.content;
      
      try {
        // Parse the JSON response - OpenRouter with json_object format should return valid JSON
        const parsedData = JSON.parse(responseText);
        
        // Validate that we have the expected structure
        if (!parsedData.itineraryOptions || !Array.isArray(parsedData.itineraryOptions)) {
          console.error('Invalid response format from OpenRouter:', responseText);
          return {
            success: false,
            error: 'Invalid itinerary options format from AI service'
          };
        }
        
        return {
          success: true,
          itineraryOptions: parsedData.itineraryOptions
        };
      } catch (parseError) {
        console.error('Failed to parse JSON from OpenRouter response:', parseError);
        console.error('Raw response:', responseText);
        return {
          success: false,
          error: 'Failed to parse response from AI service'
        };
      }
    } catch (error: any) {
      // Log detailed error information for debugging
      console.error('Error calling OpenRouter API:', error);
      
      if (error.response) {
        // The request was made and the server responded with a status code outside of 2xx range
        console.error('OpenRouter API response error:', {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data,
          headers: error.response.headers
        });
      } else if (error.request) {
        // The request was made but no response was received
        console.error('OpenRouter API request error (no response):', error.request);
      } else {
        // Something happened in setting up the request
        console.error('OpenRouter API setup error:', error.message);
      }
      
      return {
        success: false,
        error: `Failed to generate itinerary options: ${error.message || 'Unknown error'}`
      };
    }
  },

  /**
   * Generate a final detailed itinerary based on user selections
   */
  generateFinalItinerary: async (
    tripDetails: TripDetails,
    selectedActivities: ActivityOption[]
  ): Promise<GeminiResponse> => {
    try {
      console.log('Generating final itinerary with OpenRouter API using selected activities');
      const apiKey = process.env.OPEN_ROUTER_API_KEY || process.env.NEXT_PUBLIC_OPEN_ROUTER_API_KEY;
      
      console.log('OPEN_ROUTER_API_KEY available:', !!process.env.OPEN_ROUTER_API_KEY);
      console.log('NEXT_PUBLIC_OPEN_ROUTER_API_KEY available:', !!process.env.NEXT_PUBLIC_OPEN_ROUTER_API_KEY);
      console.log('Combined API Key available:', !!apiKey, apiKey ? `(length: ${apiKey.length})` : '');
      
      if (!apiKey) {
        console.error('OpenRouter API key is missing');
        return {
          success: false,
          error: 'API key is missing. Please check your environment configuration.'
        };
      }

      // Create a prompt that includes the selected activities
      const selectedActivitiesByDay = selectedActivities.reduce((acc, activity) => {
        // Group by day number
        const day = activity.dayNumber || 1;
        if (!acc[day]) {
          acc[day] = [];
        }
        acc[day].push(activity);
        return acc;
      }, {} as Record<number, ActivityOption[]>);

      const selectedActivitiesText = Object.entries(selectedActivitiesByDay)
        .map(([day, activities]) => {
          return `Day ${day}:\n${activities.map(a => `- ${a.title} (${a.type}): ${a.description}`).join('\n')}`;
        })
        .join('\n\n');

      const prompt = `
        As a travel planning AI, create a detailed day-by-day itinerary for a trip to ${tripDetails.mainDestination}.
        
        Trip details:
        - Title: ${tripDetails.title}
        - Duration: ${tripDetails.duration} days
        - Dates: From ${tripDetails.startDate} to ${tripDetails.endDate}
        - Budget: ${tripDetails.budget || 'Not specified'}
        ${tripDetails.notes ? `- Special notes: ${tripDetails.notes}` : ''}
        
        The traveler has selected the following activities to include:
        
        ${selectedActivitiesText}
        
        Create a cohesive itinerary that includes these selected activities and adds appropriate meal recommendations,
        transit information, and additional context to make a complete travel plan.
        
        Format your response as a valid JSON object following this structure:
        {
          "finalItinerary": {
            "id": "trip-id",
            "title": "Final Itinerary Title",
            "description": "Overall trip description",
            "days": [
              {
                "dayNumber": 1,
                "date": "YYYY-MM-DD",
                "title": "Day 1: Title",
                "description": "Day summary",
                "activities": [
                  {
                    "id": "act1",
                    "title": "Activity Name",
                    "description": "Detailed description",
                    "type": "sightseeing",
                    "location": {
                      "name": "Location Name",
                      "address": "Full address",
                      "placeId": "Google Place ID if available",
                      "coordinates": {
                        "lat": 0.0,
                        "lng": 0.0
                      }
                    },
                    "startTime": "09:00",
                    "endTime": "11:00",
                    "duration": "2 hours",
                    "imageUrl": "optional-image-url",
                    "mapUrl": "https://maps.google.com/?q=location",
                    "cost": "$20",
                    "notes": "Any special notes"
                  }
                ],
                "meals": {
                  "breakfast": {
                    "name": "Breakfast Place",
                    "location": "Location name",
                    "description": "Brief description",
                    "placeId": "Google Place ID if available"
                  },
                  "lunch": { ... },
                  "dinner": { ... }
                }
              }
            ]
          }
        }
        
        Ensure each day has logical flow, with activities ordered in a way that makes geographical sense.
        Include suggestions for transit between activities where appropriate.
      `;

      const response = await axios.post(
        OPENROUTER_API_URL,
        {
          model: 'openai/gpt-4o', // Using GPT-4o for high-quality itinerary generation
          messages: [
            {
              role: 'system',
              content: 'You are a travel planning AI assistant that creates detailed itineraries in valid JSON format. Always structure your response exactly as requested.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          response_format: { type: 'json_object' }, // Enforcing JSON response format
          temperature: 0.7,
          max_tokens: 8192,
          top_p: 0.95,
        },
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'HTTP-Referer': 'https://pandatravelog.netlify.app', // Your site URL for attribution
            'X-Title': 'PandaTraveLog', // Your site name for attribution
            'Content-Type': 'application/json'
          }
        }
      );

      // Extract the response text from OpenRouter format
      const responseText = response.data.choices[0].message.content;
      
      // Log the full response for debugging
      console.log('OpenRouter API raw response:', responseText);
      
      try {
        // Parse the JSON response - OpenRouter with json_object format should return valid JSON
        const parsedData = JSON.parse(responseText);
        
        // Validate that we have the expected structure
        if (!parsedData.finalItinerary) {
          console.error('Invalid response format from OpenRouter:', responseText);
          return {
            success: false,
            error: 'Invalid itinerary format from AI service'
          };
        }

        return {
          success: true,
          finalItinerary: parsedData.finalItinerary
        };
      } catch (parseError) {
        console.error('Error parsing JSON from OpenRouter response:', parseError);
        console.error('Raw response:', responseText);
        return {
          success: false,
          error: 'Invalid JSON format in response'
        };
      }
    } catch (error) {
      console.error('Error calling OpenRouter API for final itinerary:', error);
      return {
        success: false,
        error: 'Failed to generate final itinerary. Please try again.'
      };
    }
  }
};
