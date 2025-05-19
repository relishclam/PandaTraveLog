// src/services/openrouter-service.ts
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

export interface OpenRouterResponse {
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

export const openRouterService = {
  /**
   * Generate initial itinerary options based on trip details
   */
  generateItineraryOptions: async (tripDetails: TripDetails, apiKey?: string): Promise<OpenRouterResponse> => {
    try {
      console.log('Generating itinerary options with OpenRouter API for:', tripDetails);
    
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
      
      // Try provided API key first, then server-side key, then fall back to client-side key
      const effectiveApiKey = apiKey || process.env.OPENROUTER_API_KEY || process.env.OPEN_ROUTER_API_KEY || process.env.NEXT_PUBLIC_OPEN_ROUTER_API_KEY;
      
      console.log('OPENROUTER_API_KEY available:', !!process.env.OPENROUTER_API_KEY);
      console.log('OPEN_ROUTER_API_KEY available:', !!process.env.OPEN_ROUTER_API_KEY);
      console.log('NEXT_PUBLIC_OPEN_ROUTER_API_KEY available:', !!process.env.NEXT_PUBLIC_OPEN_ROUTER_API_KEY);
      console.log('Combined API Key available:', !!effectiveApiKey, effectiveApiKey ? `(length: ${effectiveApiKey.length})` : '');
      
      if (!effectiveApiKey) {
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
              "title": "Option 1 Title",
              "description": "Brief description of this option",
              "highlights": ["Highlight 1", "Highlight 2", "Highlight 3"],
              "days": [
                {
                  "dayNumber": 1,
                  "title": "Day 1 Title",
                  "description": "Brief description of day 1",
                  "activities": [
                    {
                      "id": "act1",
                      "title": "Activity Title",
                      "description": "Activity description",
                      "type": "sightseeing", // Options: sightseeing, adventure, relaxation, cultural, culinary, other
                      "location": "Location name",
                      "duration": "2 hours",
                      "cost": "$$"
                    },
                    // More activities...
                  ],
                  "meals": ["Breakfast at...", "Lunch at...", "Dinner at..."]
                }
                // More days...
              ]
            }
            // More options...
          ]
        }
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
            'Authorization': `Bearer ${effectiveApiKey}`,
            'HTTP-Referer': 'https://pandatravelog.netlify.app', // Your site URL for attribution
            'X-Title': 'PandaTraveLog', // Your site name for attribution
            'Content-Type': 'application/json'
          }
        }
      );

      // Extract the response text from OpenRouter format
      const responseText = response.data.choices[0].message.content;
      
      // Log response details for debugging
      console.log('OpenRouter API response received');
      
      try {
        // Parse the JSON response
        const parsedData = JSON.parse(responseText);
        
        // Validate the response structure
        if (!parsedData.itineraryOptions || !Array.isArray(parsedData.itineraryOptions)) {
          console.error('Invalid response structure from OpenRouter:', responseText);
          return {
            success: false,
            error: 'Invalid itinerary format from AI service'
          };
        }
        
        return {
          success: true,
          itineraryOptions: parsedData.itineraryOptions
        };
      } catch (parseError) {
        console.error('Error parsing JSON from OpenRouter response:', parseError);
        console.error('Raw response:', responseText);
        return {
          success: false,
          error: 'Invalid JSON format in response'
        };
      }
    } catch (error: any) {
      console.error('Error calling OpenRouter API:', error.response ? {
        status: error.response.status,
        data: error.response.data
      } : error.message);
      
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message || 'Failed to generate itinerary options'
      };
    }
  },

  /**
   * Generate a final detailed itinerary based on user selections
   */
  generateFinalItinerary: async (
    tripDetails: TripDetails,
    selectedActivities: ActivityOption[],
    apiKey?: string
  ): Promise<OpenRouterResponse> => {
    try {
      console.log('Generating final itinerary with OpenRouter API');
      console.log('Trip details:', tripDetails);
      console.log(`Selected activities: ${selectedActivities.length}`);
      
      // Try provided API key first, then server-side key, then fall back to client-side key
      const effectiveApiKey = apiKey || process.env.OPENROUTER_API_KEY || process.env.OPEN_ROUTER_API_KEY || process.env.NEXT_PUBLIC_OPEN_ROUTER_API_KEY;
      
      console.log('API key available:', !!effectiveApiKey);
      
      if (!effectiveApiKey) {
        console.error('OpenRouter API key is missing');
        return {
          success: false,
          error: 'API key is missing. Please check your environment configuration.'
        };
      }
      
      // Build a comprehensive prompt with all selected activities and preferences
      const activityDetails = selectedActivities.map(act => 
        `- Day ${act.dayNumber}: ${act.title} - ${act.description} (${act.type})`
      ).join('\n');
      
      const prompt = `
        Create a detailed final itinerary for a trip to ${tripDetails.mainDestination}.
        
        Trip details:
        - Title: ${tripDetails.title}
        - Duration: ${tripDetails.duration} days
        - Dates: From ${tripDetails.startDate} to ${tripDetails.endDate}
        - Budget: ${tripDetails.budget || 'Not specified'}
        ${tripDetails.notes ? `- Special notes: ${tripDetails.notes}` : ''}
        
        The traveler has selected the following activities:
        ${activityDetails}
        
        Please organize these activities into a coherent day-by-day itinerary.
        Add transportation options between activities and suggested meal options.
        
        Format your response as a valid JSON object with this structure:
        {
          "finalItinerary": {
            "id": "final-itinerary",
            "title": "${tripDetails.title}",
            "description": "A custom-crafted itinerary for your trip to ${tripDetails.mainDestination}",
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
            'Authorization': `Bearer ${effectiveApiKey}`,
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
