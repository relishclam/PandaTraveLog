// src/services/openrouter-service.ts
import axios from 'axios';

export interface TripDetails {
  title: string;
  startDate: string;
  endDate: string;
  duration: number;
  budget?: string;
  interests?: string;
  mainDestination: string;
  allDestinations: string[];
  userCountry?: string;
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

// Define additional interfaces for type safety
interface ParsedItineraryOption {
  id?: string;
  title?: string;
  description?: string;
  highlights?: string[];
  days?: ParsedItineraryDayOption[];
}

interface ParsedItineraryDayOption {
  dayNumber?: number;
  title?: string;
  description?: string;
  activities?: ParsedActivityOption[];
  meals?: string[];
}

interface ParsedActivityOption {
  id?: string;
  title?: string;
  description?: string;
  type?: string;
  location?: string;
  duration?: string;
  cost?: string;
  dayNumber?: number;
}

export interface EmergencyContact {
  name: string;
  type: 'Accommodation' | 'Transport' | 'Embassy' | 'Local Authority' | 'Other';
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
}

export interface ExtractionContext {
  destination: string;
  accommodations: any[];
  transport: any[];
}

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

// Helper function to ensure activity type is one of the allowed values
function validateActivityType(type: string): 'sightseeing' | 'adventure' | 'relaxation' | 'cultural' | 'culinary' | 'other' {
  const validTypes = ['sightseeing', 'adventure', 'relaxation', 'cultural', 'culinary', 'other'];
  return validTypes.includes(type.toLowerCase()) 
    ? type.toLowerCase() as 'sightseeing' | 'adventure' | 'relaxation' | 'cultural' | 'culinary' | 'other'
    : 'other';
}

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
        ${tripDetails.interests ? `- Traveler interests: ${tripDetails.interests}` : ''}
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
      console.log('OpenRouter API response data:', JSON.stringify(response.data, null, 2));
      
      // Safely extract the response text from OpenRouter format with proper error handling
      if (!response.data) {
        console.error('Empty response data from OpenRouter API');
        return {
          success: false,
          error: 'Empty response from OpenRouter API'
        };
      }
      
      // Check for choices array existence
      if (!response.data.choices || !Array.isArray(response.data.choices) || response.data.choices.length === 0) {
        console.error('Missing or empty choices array in OpenRouter response:', response.data);
        return {
          success: false,
          error: 'Invalid response format from AI service'
        };
      }
      
      // Get the first choice content based on whether it's streaming or not
      const firstChoice = response.data.choices[0];
      let responseText: string;
      
      if (firstChoice.message && firstChoice.message.content) {
        // Standard format
        responseText = firstChoice.message.content;
      } else if (firstChoice.delta && firstChoice.delta.content) {
        // Streaming format
        responseText = firstChoice.delta.content;
      } else if (firstChoice.text) {
        // Legacy format
        responseText = firstChoice.text;
      } else {
        console.error('Cannot find content in API response choice:', firstChoice);
        return {
          success: false,
          error: 'Could not extract content from AI response'
        };
      }
      
      // Check if we actually have text content
      if (typeof responseText !== 'string' || !responseText.trim()) {
        console.error('Empty or invalid content received from OpenRouter:', responseText);
        return {
          success: false,
          error: 'Received empty content from AI service'
        };
      }
      
      let parsedData: any;
      
      try {
        // First, log the start of the response to help with debugging
        console.log('Response text preview:', responseText.substring(0, 200) + '...');
        
        // Try to parse as JSON
        parsedData = JSON.parse(responseText);
        console.log('Successfully parsed JSON from OpenRouter response');
      } catch (parseError) {
        console.error('Failed to parse response as JSON:', parseError);
        // The text might contain a JSON string embedded in explanatory text
        // Try to extract JSON using regex
        try {
          const jsonMatch = responseText.match(/\{[\s\S]*\}/); // Matches JSON object
          if (jsonMatch) {
            console.log('Found potential JSON object in response text, attempting to parse');
            parsedData = JSON.parse(jsonMatch[0]);
            console.log('Successfully extracted and parsed JSON from response text');
          } else {
            throw new Error('Could not find valid JSON in response');
          }
        } catch (extractError) {
          console.error('Failed to extract and parse JSON from response:', extractError);
          return {
            success: false,
            error: 'Could not parse response from AI service'
          };
        }
      }
      
      // Detailed validation of response structure
      if (!parsedData) {
        console.error('Empty parsed data from OpenRouter');
        return {
          success: false,
          error: 'Empty response from AI service'
        };
      }
      
      // Try to extract itinerary options using various potential structures
      let itineraryOptions: ParsedItineraryOption[] | null = null;
      
      // Check for directly provided itineraryOptions
      if (parsedData.itineraryOptions && Array.isArray(parsedData.itineraryOptions)) {
        console.log('Found itineraryOptions in response');
        itineraryOptions = parsedData.itineraryOptions;
      } 
      // Check if we received a finalItinerary instead
      else if (parsedData.finalItinerary) {
        console.warn('Found finalItinerary instead of itineraryOptions, adapting format');
        // Convert finalItinerary to itinerary option format
        const adaptedOption: ParsedItineraryOption = {
          id: 'adapted-option',
          title: parsedData.finalItinerary.title || 'Recommended Itinerary',
          description: parsedData.finalItinerary.description || 'Custom itinerary for your trip',
          highlights: ['Automatically generated based on your preferences'],
          days: parsedData.finalItinerary.days || []
        };
        
        itineraryOptions = [adaptedOption];
      }
      // Check for other possible option array formats
      else if (parsedData.options || parsedData.itineraries || parsedData.plans) {
        const possibleOptions = parsedData.options || parsedData.itineraries || parsedData.plans;
        if (Array.isArray(possibleOptions)) {
          console.warn('Found alternative options array (options/itineraries/plans), adapting format');
          itineraryOptions = possibleOptions;
        }
      }
      // If still no valid options, try to see if the response itself is an array of options
      else if (Array.isArray(parsedData)) {
        console.warn('Parsed data is an array, treating as itinerary options directly');
        itineraryOptions = parsedData;
      }
      
      // Final check if we found valid options
      if (!itineraryOptions) {
        console.error('Could not find valid itinerary options in response:', parsedData);
        return {
          success: false,
          error: 'Invalid response format: could not locate itinerary options'
        };
      }
      
      // Validate content of itinerary options
      if (itineraryOptions.length === 0) {
        console.error('Empty itineraryOptions array');
        return {
          success: false,
          error: 'No itinerary options generated'
        };
      }
      
      // Further validation and processing of the itinerary options
      const validOptions: ItineraryOption[] = itineraryOptions
        .filter((option: ParsedItineraryOption) => option && option.days && Array.isArray(option.days))
        .map((option: ParsedItineraryOption): ItineraryOption => {
          // Ensure each option has required fields
          return {
            id: option.id || `option-${Math.random().toString(36).substring(2, 9)}`,
            title: option.title || 'Itinerary Option',
            description: option.description || 'Custom itinerary for your trip',
            highlights: Array.isArray(option.highlights) ? option.highlights : ['Custom itinerary based on your preferences'],
            days: option.days?.map((day: ParsedItineraryDayOption): ItineraryDayOption => {
              // Ensure each day has proper structure
              return {
                dayNumber: day.dayNumber || 0,
                title: day.title || `Day ${day.dayNumber || 0}`,
                description: day.description || 'Activities for the day',
                activities: Array.isArray(day.activities) ? day.activities.map((act: ParsedActivityOption): ActivityOption => {
                  // Ensure each activity has proper structure and validate the type
                  const activityType = validateActivityType(act.type || 'other');
                  
                  return {
                    id: act.id || `act-${Math.random().toString(36).substring(2, 9)}`,
                    title: act.title || 'Activity',
                    description: act.description || '',
                    type: activityType,
                    location: act.location || 'Location not specified',
                    duration: act.duration || '1-2 hours',
                    cost: act.cost || '$',
                    dayNumber: day.dayNumber || 0
                  };
                }) : [],
                meals: day.meals || []
              };
            }) || []
          };
        });
      
      console.log(`Returning ${validOptions.length} validated itinerary options`);
      return {
        success: true,
        itineraryOptions: validOptions
      };
      
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
        ${tripDetails.interests ? `- Traveler interests: ${tripDetails.interests}` : ''}
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
      const responseText: string = response.data.choices[0].message.content;
      console.log('OpenRouter API content response for final itinerary:', responseText.substring(0, 200) + '...');   
      
      let parsedData: any;
      
      try {
        // Parse the JSON response - OpenRouter with json_object format should return valid JSON
        parsedData = JSON.parse(responseText);
        console.log('Successfully parsed JSON response from OpenRouter for final itinerary');
      } catch (parseError) {
        console.error('Error parsing JSON from OpenRouter response:', parseError);
        console.error('Raw response:', responseText);
        return {
          success: false,
          error: 'Invalid JSON format in response'
        };
      }
      
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
      
    } catch (error: any) {
      console.error('Error calling OpenRouter API for final itinerary:', error.response ? {
        status: error.response.status,
        data: error.response.data
      } : error.message);
      
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message || 'Failed to generate final itinerary. Please try again.'
      };
    }
  },

  async extractEmergencyContacts(context: ExtractionContext, apiKey?: string): Promise<EmergencyContact[]> {
    const { destination, accommodations, transport } = context;

    const systemPrompt = `
      You are a highly intelligent travel assistant named PO, specialized in identifying and extracting emergency contact information from trip data.
      Your task is to analyze the provided JSON data which contains hotel bookings and transportation details for a trip to ${destination}.
      Extract any potential emergency contacts such as hotels, airlines, car rental agencies, train services, embassies, or local emergency services.

      Rules:
      1.  Extract the full name of the establishment (e.g., "Hilton Garden Inn").
      2.  Categorize the contact correctly as 'Accommodation', 'Transport', 'Embassy', or 'Other'.
      3.  Extract phone numbers, email addresses, and physical addresses if available.
      4.  If the data contains confirmation numbers or booking references, add them to the 'notes' field.
      5.  Do NOT invent information. Only extract data present in the provided JSON.
      6.  If no contacts can be found, return an empty array.
      7.  Your final output MUST be a valid JSON array of objects, where each object conforms to the specified EmergencyContact structure. Do not include any explanatory text or markdown formatting.

      JSON Output Structure:
      [
        {
          "name": "string",
          "type": "'Accommodation' | 'Transport' | 'Embassy' | 'Other'",
          "phone": "string | undefined",
          "email": "string | undefined",
          "address": "string | undefined",
          "notes": "string | undefined"
        }
      ]
    `;

    const userMessage = `
      Here is the trip data. Please extract the emergency contacts based on these details.

      Destination: ${destination}

      Accommodations:
      ${JSON.stringify(accommodations, null, 2)}

      Transport:
      ${JSON.stringify(transport, null, 2)}
    `;

    try {
      const response = await axios.post(
        OPENROUTER_API_URL,
        {
          model: 'claude-3.5-sonnet',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.1,
        },
        {
          headers: {
            'Authorization': `Bearer ${apiKey || process.env.NEXT_PUBLIC_OPENROUTER_API_KEY}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const content = response.data.choices[0].message.content;
      const parsedContent = JSON.parse(content);

      // The AI might wrap the result in a key, e.g., { "contacts": [...] }
      const contacts = parsedContent.contacts || parsedContent;
      
      if (!Array.isArray(contacts)) {
        throw new Error('AI response is not a valid array of contacts.');
      }

      return contacts as EmergencyContact[];

    } catch (error: any) {
      console.error('Error extracting emergency contacts:', error.response ? error.response.data : error.message);
      // In case of an error, return an empty array to prevent crashing the app
      return [];
    }
  }
};