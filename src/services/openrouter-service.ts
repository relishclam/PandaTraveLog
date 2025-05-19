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
  canSaveItinerary?: boolean;
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
      const prompt = `
        Create 3 distinct travel itinerary options for a ${tripDetails.duration}-day trip to ${tripDetails.mainDestination}.
        
        Trip details:
        - Title: ${tripDetails.title}
        - Dates: From ${tripDetails.startDate} to ${tripDetails.endDate}
        - Duration: ${tripDetails.duration} days
        - Budget: ${tripDetails.budget || 'Not specified'}
        ${tripDetails.notes ? `- Special notes: ${tripDetails.notes}` : ''}
        ${tripDetails.allDestinations.length > 1 ? `- Other destinations to include: ${tripDetails.allDestinations.filter(d => d !== tripDetails.mainDestination).join(', ')}` : ''}
        
        Consider the season and weather for ${tripDetails.mainDestination} during ${new Date(tripDetails.startDate).toLocaleString('en-US', { month: 'long' })}.
        
        For each itinerary option, please provide:
        - A unique title that captures the theme of the itinerary
        - A brief description (1-2 sentences)
        - 3-5 highlights/unique selling points
        - A day-by-day breakdown with:
          * Recommended activities and attractions (including specific places with their actual names)
          * Suggested places to eat (with actual restaurant names when possible)
          * Transportation recommendations between locations
          * Approximate timing and duration for activities
          * Estimated cost level for activities ($ to $$$)
          
        Each itinerary option should have a different focus/theme, such as:
        - Option 1: Major highlights and must-see attractions for first-time visitors
        - Option 2: Off-the-beaten-path and authentic local experiences
        - Option 3: Family-friendly activities and attractions OR Specialized interests (nature, history, food, etc.)
        
        Important considerations:
        - Ensure each day has a logical geographic flow to minimize travel time
        - Include a mix of morning, afternoon, and evening activities
        - Allow sufficient time between activities for transportation
        - Include at least one notable/famous attraction in each itinerary
        - Suggest realistic meal options near the day's activities
        - Account for opening hours of attractions (don't suggest evening visits to places that close early)
        
        Format your response as a valid JSON object with this structure:
        {
          "itineraryOptions": [
            {
              "id": "option1",
              "title": "Option 1 Title",
              "description": "Brief description of the itinerary theme/focus",
              "highlights": [
                "Highlight 1",
                "Highlight 2",
                "Highlight 3"
              ],
              "days": [
                {
                  "dayNumber": 1,
                  "title": "Day 1 Title",
                  "description": "Brief description of the day",
                  "activities": [
                    {
                      "id": "activity1",
                      "title": "Activity Name",
                      "description": "Brief description including why this is worth visiting",
                      "type": "sightseeing",
                      "location": "Exact location name",
                      "duration": "2 hours",
                      "cost": "$"
                    }
                  ],
                  "meals": [
                    "Breakfast: Restaurant name - Brief description",
                    "Lunch: Restaurant name - Brief description",
                    "Dinner: Restaurant name - Brief description"
                  ]
                }
              ]
            }
          ]
        }`;

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

      // Log response details for debugging
      console.log('OpenRouter API response received');
      
      // Safely extract the response text from OpenRouter format with proper error handling
      if (!response.data || !response.data.choices || !response.data.choices.length || !response.data.choices[0].message) {
        console.error('Unexpected API response structure:', response.data);
        return {
          success: false,
          error: 'Invalid API response structure'
        };
      }
      
      const responseText = response.data.choices[0].message.content;
      
      try {
        // Parse the JSON response
        const parsedData = JSON.parse(responseText);
        console.log('Successfully parsed JSON response from OpenRouter');
        
        // Detailed validation of response structure
        if (!parsedData) {
          console.error('Empty response from OpenRouter');
          return {
            success: false,
            error: 'Empty response from AI service'
          };
        }
        
        if (!parsedData.itineraryOptions) {
          console.error('Missing itineraryOptions in response:', parsedData);
          
          // Check if we received finalItinerary instead (wrong format but salvageable)
          if (parsedData.finalItinerary) {
            console.warn('Received finalItinerary instead of itineraryOptions, attempting to adapt');
            // Convert finalItinerary to itinerary option format
            const adaptedOption = {
              id: 'adapted-option',
              title: parsedData.finalItinerary.title || 'Recommended Itinerary',
              description: parsedData.finalItinerary.description || 'Custom itinerary for your trip',
              highlights: ['Automatically generated based on your preferences'],
              days: parsedData.finalItinerary.days || []
            };
            
            return {
              success: true,
              itineraryOptions: [adaptedOption]
            };
          }
          
          // Check for other possible response formats
          if (parsedData.options || parsedData.itineraries || parsedData.plans) {
            const possibleOptions = parsedData.options || parsedData.itineraries || parsedData.plans;
            if (Array.isArray(possibleOptions)) {
              console.warn('Found alternative options array, attempting to adapt');
              return {
                success: true,
                itineraryOptions: possibleOptions
              };
            }
          }
          
          return {
            success: false,
            error: 'Invalid response format: itineraryOptions not found'
          };
        }
        
        if (!Array.isArray(parsedData.itineraryOptions)) {
          console.error('itineraryOptions is not an array:', parsedData.itineraryOptions);
          return {
            success: false,
            error: 'Invalid response format: itineraryOptions is not an array'
          };
        }
        
        if (parsedData.itineraryOptions.length === 0) {
          console.error('Empty itineraryOptions array');
          return {
            success: false,
            error: 'No itinerary options generated'
          };
        }
        
        // Validate each itinerary option has required fields
        const validOptions = parsedData.itineraryOptions.filter((option: any) => {
          return option && option.id && option.title && option.days && Array.isArray(option.days);
        });
        
        if (validOptions.length === 0) {
          console.error('No valid itinerary options in response');
          return {
            success: false,
            error: 'No valid itinerary options received'
          };
        }
        
        if (validOptions.length < parsedData.itineraryOptions.length) {
          console.warn(`Only ${validOptions.length} of ${parsedData.itineraryOptions.length} options were valid`);
        }
        
        console.log(`Successfully extracted ${validOptions.length} valid itinerary options`);
        return {
          success: true,
          itineraryOptions: validOptions
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
        - Dates: From ${tripDetails.startDate} to ${tripDetails.endDate} (${new Date(tripDetails.startDate).toLocaleString('en-US', { month: 'long' })})
        - Budget: ${tripDetails.budget || 'Not specified'}
        ${tripDetails.notes ? `- Special notes: ${tripDetails.notes}` : ''}
        ${tripDetails.allDestinations.length > 1 ? `- Other destinations to include: ${tripDetails.allDestinations.filter(d => d !== tripDetails.mainDestination).join(', ')}` : ''}
        
        The traveler has selected the following activities:
        ${activityDetails}
        
        Important instructions:
        1. Organize the selected activities into a coherent day-by-day itinerary
        2. Add specific transportation options between activities (public transit, walking, taxi, etc.) with estimated travel times
        3. Suggest actual restaurants or eateries near each day's activities for breakfast, lunch, and dinner
        4. Schedule activities with logical timing throughout the day (morning, afternoon, evening)
        5. Ensure the flow of each day makes geographic sense to minimize travel time
        6. Add brief descriptions for each activity explaining what makes it special
        7. Include practical details like opening hours, estimated costs, and recommended duration
        8. Consider local weather and seasonal conditions for ${new Date(tripDetails.startDate).toLocaleString('en-US', { month: 'long' })}
        
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

      // Log the full response for debugging
      console.log('OpenRouter API raw response structure:', JSON.stringify(response.data, null, 2));

      // Check if the response has the expected structure
      if (!response.data || !response.data.choices || !response.data.choices.length || !response.data.choices[0].message) {
        console.error('Unexpected OpenRouter API response format:', response.data);
        return {
          success: false,
          error: 'Unexpected response format from OpenRouter API'
        };
      }
      
      // Extract the response text from OpenRouter format
      const responseText = response.data.choices[0].message.content;
      console.log('OpenRouter API content response for final itinerary:', responseText.substring(0, 200) + '...');   
      try {
        // Parse the JSON response - OpenRouter with json_object format should return valid JSON
        const parsedData = JSON.parse(responseText);
        console.log('Successfully parsed JSON response from OpenRouter for final itinerary');
        
        // Detailed validation of response structure
        if (!parsedData) {
          console.error('Empty response from OpenRouter');
          return {
            success: false,
            error: 'Empty response from AI service'
          };
        }
        
        if (!parsedData.finalItinerary) {
          console.error('Missing finalItinerary in response:', parsedData);
          
          // Check if we received itineraryOptions instead (wrong format but salvageable)
          if (parsedData.itineraryOptions && Array.isArray(parsedData.itineraryOptions) && parsedData.itineraryOptions.length > 0) {
            console.warn('Received itineraryOptions instead of finalItinerary, attempting to adapt the first option');
            // Convert first itinerary option to final itinerary format
            const firstOption = parsedData.itineraryOptions[0];
            if (firstOption && firstOption.days && Array.isArray(firstOption.days)) {
              return {
                success: true,
                finalItinerary: {
                  id: 'final-' + (firstOption.id || 'itinerary'),
                  title: firstOption.title || 'Your Final Itinerary',
                  description: firstOption.description || 'Customized itinerary for your trip',
                  days: firstOption.days
                }
              };
            }
          }
          
          return {
            success: false,
            error: 'Invalid response format: finalItinerary not found'
          };
        }
        
        // Validate the finalItinerary structure
        if (!parsedData.finalItinerary.days || !Array.isArray(parsedData.finalItinerary.days)) {
          console.error('Invalid finalItinerary structure: days array missing or not an array');
          return {
            success: false,
            error: 'Invalid itinerary format: days missing or invalid'
          };
        }
        
        if (parsedData.finalItinerary.days.length === 0) {
          console.error('Empty days array in finalItinerary');
          return {
            success: false,
            error: 'Generated itinerary contains no days'
          };
        }
        
        // Make sure we have title and description
        if (!parsedData.finalItinerary.title) {
          parsedData.finalItinerary.title = tripDetails.title || 'Your Trip to ' + tripDetails.mainDestination;
        }
        
        if (!parsedData.finalItinerary.description) {
          parsedData.finalItinerary.description = `A ${tripDetails.duration}-day itinerary for ${tripDetails.mainDestination}`;
        }
        
        console.log(`Successfully validated final itinerary with ${parsedData.finalItinerary.days.length} days`);
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
