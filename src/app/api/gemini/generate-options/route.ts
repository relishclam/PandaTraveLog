import { NextResponse } from 'next/server';
import { geminiService, TripDetails } from '@/services/gemini-service';

export async function POST(request: Request) {
  try {
    console.log('API route /api/gemini/generate-options called');
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

    console.log('Trip details validated, calling Gemini service');
    console.log('API key check:', process.env.GEMINI_API_KEY ? 'Server-side key available' : 'No server-side key', 
               process.env.NEXT_PUBLIC_GEMINI_API_KEY ? 'Client-side key available' : 'No client-side key');
    
    // Call Gemini service to generate itinerary options
    const response = await geminiService.generateItineraryOptions(tripDetails);
    console.log('Gemini service response:', response.success ? 'Success' : 'Failed', 
               response.error || '', 
               response.itineraryOptions ? `Got ${response.itineraryOptions.length} options` : 'No options');
    
    return NextResponse.json(response);
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
