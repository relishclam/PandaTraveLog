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
      const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
      
      console.log('API Key available:', !!apiKey, apiKey ? `(length: ${apiKey.length})` : '');
      
      if (!apiKey) {
        console.error('Gemini API key is missing');
        return {
          success: false,
          error: 'API key is missing. Please check your environment configuration.'
        };
      }

      // Craft a detailed prompt for the Gemini API
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
      
      // Log the full response for debugging
      console.log('Gemini API raw response:', responseText);
      
      // Find and parse the JSON object from the response
      let jsonMatch = responseText.match(/{[\s\S]*}/);
      if (!jsonMatch) {
        console.error('Failed to extract JSON from Gemini response');
        return {
          success: false,
          error: 'Invalid response format from AI service'
        };
      }

      try {
        const jsonString = jsonMatch[0];
        const parsedData = JSON.parse(jsonString);
        console.log('Successfully parsed Gemini API response:', parsedData);
        
        // Check if itineraryOptions exists in the parsed data
        if (!parsedData.itineraryOptions || !Array.isArray(parsedData.itineraryOptions) || parsedData.itineraryOptions.length === 0) {
          console.error('No itinerary options found in response:', parsedData);
          
          // Create mock data for testing
          console.warn('Generating mock itinerary options for testing');
          return {
            success: true,
            itineraryOptions: [
              {
                id: 'option1',
                title: 'Adventurous Exploration',
                description: 'A thrilling journey through the most exciting parts of your destination.',
                highlights: ['Adventurous activities', 'Natural wonders', 'Unique experiences'],
                days: [
                  {
                    dayNumber: 1,
                    title: 'Day 1: Arrival and Exploration',
                    description: 'Begin your adventure with exciting activities.',
                    activities: [
                      {
                        id: 'act1',
                        title: 'City Tour',
                        description: 'Explore the city highlights.',
                        type: 'sightseeing',
                        location: 'Downtown',
                        duration: '3 hours'
                      }
                    ]
                  }
                ]
              },
              {
                id: 'option2',
                title: 'Cultural Immersion',
                description: 'Experience the rich cultural heritage and traditions.',
                highlights: ['Historical sites', 'Local cuisine', 'Cultural performances'],
                days: [
                  {
                    dayNumber: 1,
                    title: 'Day 1: Cultural Heritage',
                    description: 'Immerse yourself in local culture.',
                    activities: [
                      {
                        id: 'act2',
                        title: 'Museum Visit',
                        description: 'Explore the local history museum.',
                        type: 'cultural',
                        location: 'Central Museum',
                        duration: '2 hours'
                      }
                    ]
                  }
                ]
              },
              {
                id: 'option3',
                title: 'Relaxing Retreat',
                description: 'Unwind and enjoy a peaceful vacation with plenty of relaxation.',
                highlights: ['Spa treatments', 'Beach time', 'Scenic views'],
                days: [
                  {
                    dayNumber: 1,
                    title: 'Day 1: Relaxation',
                    description: 'Begin your retreat with calming activities.',
                    activities: [
                      {
                        id: 'act3',
                        title: 'Beach Day',
                        description: 'Relax at the beautiful beaches.',
                        type: 'relaxation',
                        location: 'Main Beach',
                        duration: '4 hours'
                      }
                    ]
                  }
                ]
              }
            ]
          };
        }
        
        return {
          success: true,
          itineraryOptions: parsedData.itineraryOptions
        };
      } catch (error) {
        console.error('Error parsing Gemini API response:', error);
        return {
          success: false,
          error: 'Failed to parse AI service response'
        };
      }
    } catch (error) {
      console.error('Error calling Gemini API for final itinerary:', error);
      return {
        success: false,
        error: 'Failed to generate final itinerary. Please try again.'
      };
    }
  }
};
