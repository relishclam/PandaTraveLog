import { NextResponse } from 'next/server';
import { openRouterService, TripDetails, ItineraryOption } from '@/services/openrouter-service';
import axios from 'axios';

// Function to generate fallback options if the API call fails
function generateFallbackOptions(tripDetails: TripDetails): ItineraryOption[] {
  // This is just a placeholder - in production, you'd want to implement proper fallbacks
  return [];
}

// Direct OpenRouter API call function
async function callOpenRouterDirectly(tripDetails: TripDetails, apiKey: string) {
  const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
  
  // Create a detailed prompt for the itinerary generation
  const prompt = `Generate 3 different itinerary options for a ${tripDetails.duration}-day trip to ${tripDetails.mainDestination}.
  Trip details:
  - Title: ${tripDetails.title}
  - Dates: ${tripDetails.startDate} to ${tripDetails.endDate}
  - Duration: ${tripDetails.duration} days
  - Main destination: ${tripDetails.mainDestination}
  - Additional destinations: ${tripDetails.allDestinations.join(', ')}
  ${tripDetails.interests ? `- Interests: ${tripDetails.interests}` : ''}
  ${tripDetails.budget ? `- Budget: ${tripDetails.budget}` : ''}
  ${tripDetails.userCountry ? `- Traveler from: ${tripDetails.userCountry}` : ''}
  
  Format the response as a valid JSON object with the following structure:
  {
    "itineraryOptions": [
      {
        "id": "option-1",
        "title": "Option 1 Title",
        "description": "Brief description of this itinerary option",
        "highlights": ["Highlight 1", "Highlight 2", "Highlight 3"],
        "days": [
          {
            "dayNumber": 1,
            "title": "Day 1 Title",
            "description": "Description of day 1",
            "activities": [
              {
                "id": "activity-1-1",
                "title": "Activity Title",
                "description": "Activity description",
                "type": "sightseeing",
                "location": "Location name",
                "duration": "2 hours",
                "cost": "$$$"
              }
            ],
            "meals": ["Breakfast at...", "Lunch at...", "Dinner at..."]
          }
        ]
      }
    ]
  }`;
  
  // Configure the API request
  const response = await axios.post(
    OPENROUTER_API_URL,
    {
      model: 'openai/gpt-4o',
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      response_format: { type: 'json_object' }
    },
    {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://pandatravelog.netlify.app',
        'X-Title': 'PandaTraveLog Itinerary Generator'
      }
    }
  );
  
  return response.data;
}

export async function POST(request: Request) {
  try {
    console.log('API route /api/openrouter/generate-options called');
    const body = await request.json();
    const { tripDetails } = body as { tripDetails: TripDetails };
    
    // Validate required fields
    if (!tripDetails || !tripDetails.title || !tripDetails.startDate || !tripDetails.endDate || !tripDetails.mainDestination) {
      console.error('Missing required trip details:', tripDetails);
      return NextResponse.json(
        { success: false, error: 'Missing required trip details' },
        { status: 400 }
      );
    }
    
    // Validate and fix date formats and trip duration
    try {
      // Log the original trip details
      console.log('Original trip details:', {
        startDate: tripDetails.startDate,
        endDate: tripDetails.endDate,
        duration: tripDetails.duration
      });
      
      // Ensure dates are properly formatted
      const startDate = new Date(tripDetails.startDate);
      const endDate = new Date(tripDetails.endDate);
      
      // Verify if the dates are valid
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        console.error('Invalid date format received:', { startDate: tripDetails.startDate, endDate: tripDetails.endDate });
        return NextResponse.json(
          { success: false, error: 'Invalid date format provided' },
          { status: 400 }
        );
      }
      
      // Calculate trip duration
      const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
      const calculatedDuration = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      // For same-day trips, set duration to 1
      const isSameDay = startDate.toISOString().split('T')[0] === endDate.toISOString().split('T')[0];
      const finalDuration = isSameDay ? 1 : Math.max(1, calculatedDuration);
      
      // Update duration if it doesn't match the final calculated value
      if (tripDetails.duration !== finalDuration) {
        console.log(`Fixing trip duration: ${tripDetails.duration} → ${finalDuration} (${isSameDay ? 'same-day trip' : 'multi-day trip'})`);
        tripDetails.duration = finalDuration;
      }
      
      // Format dates consistently as ISO strings (YYYY-MM-DD)
      tripDetails.startDate = startDate.toISOString().split('T')[0];
      tripDetails.endDate = endDate.toISOString().split('T')[0];
      
      console.log('Fixed trip details:', {
        startDate: tripDetails.startDate,
        endDate: tripDetails.endDate,
        duration: tripDetails.duration
      });
    } catch (err) {
      console.error('Error processing dates:', err);
      // Continue with original values if there's an error in date processing
    }

    console.log('Trip details validated, calling OpenRouter service');
    
    // Check for OpenRouter API key
    const apiKey = process.env.OPEN_ROUTER_API_KEY || process.env.NEXT_PUBLIC_OPEN_ROUTER_API_KEY;
    console.log('OpenRouter API key available:', !!apiKey, apiKey ? `(length: ${apiKey.length})` : '');
    console.log('Environment variables available:', {
      OPEN_ROUTER_API_KEY: !!process.env.OPEN_ROUTER_API_KEY,
      NEXT_PUBLIC_OPEN_ROUTER_API_KEY: !!process.env.NEXT_PUBLIC_OPEN_ROUTER_API_KEY,
      NODE_ENV: process.env.NODE_ENV
    });
    
    if (!apiKey) {
      console.error('OpenRouter API key missing in server environment');
      return NextResponse.json(
        { success: false, error: 'API key is missing on server' },
        { status: 500 }
      );
    }
    
    // Call OpenRouter API directly
    try {
      console.log('Calling OpenRouter API directly with API key');
      
      // Set a timeout for the API call to prevent Netlify function timeout
      const timeoutMs = 25000; // 25 seconds - longer timeout for direct API call
      let timeoutId: NodeJS.Timeout | undefined;
      
      // Create a promise that rejects after the timeout
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(new Error('OpenRouter API request timed out'));
        }, timeoutMs);
      });
      
      // Race the direct API call against the timeout
      const openRouterResponse = await Promise.race([
        callOpenRouterDirectly(tripDetails, apiKey),
        timeoutPromise
      ]) as any;
      
      // Clear the timeout if the API call completes successfully
      if (timeoutId) clearTimeout(timeoutId);
      
      console.log('Direct OpenRouter API response received');
      
      // Extract the content from the OpenRouter response
      const content = openRouterResponse.choices[0].message.content;
      console.log('OpenRouter content response (first 100 chars):', content.substring(0, 100));
      
      // Parse the JSON response
      const parsedData = JSON.parse(content);
      
      // Return the itinerary options
      return NextResponse.json({
        success: true,
        itineraryOptions: parsedData.itineraryOptions,
        directApiCall: true
      });
    } catch (error: any) {
      console.error('Error calling OpenRouter API directly:', error.message);
      
      // Try the service as a fallback
      try {
        console.log('Falling back to openRouterService');
        const response = await openRouterService.generateItineraryOptions(tripDetails, apiKey);
        
        return NextResponse.json(response);
      } catch (serviceError: any) {
        console.error('Service fallback also failed:', serviceError.message);
        
        // Return a more detailed error response
        return NextResponse.json({
          success: false,
          error: 'Failed to generate itinerary options',
          details: {
            directApiError: error.message,
            serviceError: serviceError.message
          }
        }, { status: 500 });
      }
    }
  } catch (error: any) {
    console.error('Error in generate-options API route:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to generate itinerary options' 
      },
      { status: 500 }
    );
  }
}
