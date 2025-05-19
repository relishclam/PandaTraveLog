import { NextResponse } from 'next/server';
import { openRouterService, TripDetails } from '@/services/openrouter-service';

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
    
    if (!apiKey) {
      console.error('OpenRouter API key missing in server environment');
      return NextResponse.json(
        { success: false, error: 'API key is missing on server' },
        { status: 500 }
      );
    }
    
    // Call service to generate itinerary options with explicit API key
    try {
      // Set a timeout for the API call to prevent Netlify function timeout
      const timeoutMs = 9000; // 9 seconds
      let timeoutId: NodeJS.Timeout | undefined;
      
      // Create a promise that rejects after the timeout
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(new Error('OpenRouter API request timed out'));
        }, timeoutMs);
      });
      
      // Race the API call against the timeout
      const response = await Promise.race([
        openRouterService.generateItineraryOptions(tripDetails, apiKey),
        timeoutPromise
      ]) as any;
      
      // Clear the timeout if the API call completes successfully
      if (timeoutId) clearTimeout(timeoutId);
      
      console.log('OpenRouter service response:', response.success ? 'Success' : 'Failed', 
                 response.error || '', 
                 response.itineraryOptions ? `Got ${response.itineraryOptions.length} options` : 'No options');
      
      return NextResponse.json(response);
    } catch (error: any) {
      console.error('Error calling OpenRouter service:', error.message);
      
      // If it's a timeout error, return a more user-friendly message
      if (error.message && error.message.includes('timed out')) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'The itinerary generation service is taking too long to respond. Please try again later.'
          },
          { status: 408 } // Request Timeout status
        );
      }
      
      // For other errors, pass through the error message
      return NextResponse.json(
        { 
          success: false, 
          error: error.message || 'Failed to generate itinerary options'
        },
        { status: 500 }
      );
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
