import { NextResponse } from 'next/server';
import { generateTripItinerary } from '@/lib/gemini-service';

export async function POST(req: Request) {
  try {
    const requestData = await req.json();

    if (!requestData.destination) {
      return NextResponse.json(
        { error: 'Destination is required' },
        { status: 400 }
      );
    }

    const itinerary = await generateTripItinerary(requestData);

    return NextResponse.json({ itinerary });
  } catch (error: any) {
    console.error('Error generating itinerary:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate itinerary' },
      { status: 500 }
    );
  }
}
