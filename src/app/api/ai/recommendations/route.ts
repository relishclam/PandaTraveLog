import { NextResponse } from 'next/server';
import { generatePlaceRecommendations } from '@/lib/gemini-service';

export async function POST(req: Request) {
  try {
    const { destination, count } = await req.json();

    if (!destination) {
      return NextResponse.json(
        { error: 'Destination is required' },
        { status: 400 }
      );
    }

    const recommendations = await generatePlaceRecommendations(destination, count || 10);

    return NextResponse.json({ recommendations });
  } catch (error: any) {
    console.error('Error generating recommendations:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate recommendations' },
      { status: 500 }
    );
  }
}
