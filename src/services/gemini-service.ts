// src/services/gemini-service.ts
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

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';

export const geminiService = {
  /**
   * Generate initial itinerary options based on trip details
   */
  generateItineraryOptions: async (tripDetails: TripDetails): Promise<GeminiResponse> => {
    try {
      console.log('Generating itinerary options with Gemini API for:', tripDetails);
      const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
      
      if (!apiKey) {
        console.error('Gemini API key is missing');
        return {
          success: false,
          error: 'API key is missing. Please check your environment configuration.'
        };
      }

      // Craft a detailed prompt for the Gemini API
      const prompt = `
        As a travel planning AI, create 3 different itinerary options for a trip to ${tripDetails.mainDestination}.
        
        Trip details:
        - Title: ${tripDetails.title}
        - Duration: ${tripDetails.duration} days
        - Dates: From ${tripDetails.startDate} to ${tripDetails.endDate}
        - Budget: ${tripDetails.budget || 'Not specified'}
        ${tripDetails.notes ? `- Special notes: ${tripDetails.notes}` : ''}
        
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
        
        Include a variety of activities (sightseeing, adventure, relaxation, cultural, culinary) and ensure each day has 3-5 activities.
        For activity types, only use these categories: sightseeing, adventure, relaxation, cultural, culinary, other.
      `;

      const response = await axios.post(
        `${GEMINI_API_URL}?key=${apiKey}`,
        {
          contents: [
            {
              parts: [
                {
                  text: prompt
                }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 8192,
            topP: 0.95,
            topK: 40
          }
        },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      // Extract the response text
      const responseText = response.data.candidates[0].content.parts[0].text;
      
      // Find and parse the JSON object from the response
      const jsonMatch = responseText.match(/{[\s\S]*}/);
      if (!jsonMatch) {
        console.error('Failed to extract JSON from Gemini response');
        return {
          success: false,
          error: 'Invalid response format from AI service'
        };
      }

      const parsedData = JSON.parse(jsonMatch[0]);
      return {
        success: true,
        itineraryOptions: parsedData.itineraryOptions
      };
    } catch (error) {
      console.error('Error calling Gemini API:', error);
      return {
        success: false,
        error: 'Failed to generate itinerary options. Please try again.'
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
      console.log('Generating final itinerary with Gemini API using selected activities');
      const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
      
      if (!apiKey) {
        console.error('Gemini API key is missing');
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
        `${GEMINI_API_URL}?key=${apiKey}`,
        {
          contents: [
            {
              parts: [
                {
                  text: prompt
                }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 8192,
            topP: 0.95,
            topK: 40
          }
        },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      // Extract the response text
      const responseText = response.data.candidates[0].content.parts[0].text;
      
      // Find and parse the JSON object from the response
      const jsonMatch = responseText.match(/{[\s\S]*}/);
      if (!jsonMatch) {
        console.error('Failed to extract JSON from Gemini response');
        return {
          success: false,
          error: 'Invalid response format from AI service'
        };
      }

      const parsedData = JSON.parse(jsonMatch[0]);
      return {
        success: true,
        finalItinerary: parsedData.finalItinerary
      };
    } catch (error) {
      console.error('Error calling Gemini API for final itinerary:', error);
      return {
        success: false,
        error: 'Failed to generate final itinerary. Please try again.'
      };
    }
  }
};
