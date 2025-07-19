import { NextRequest, NextResponse } from 'next/server';
import TripEnrichmentService from '@/services/tripEnrichmentService';

export async function POST(request: NextRequest) {
  try {
    const { tripData } = await request.json();
    
    if (!tripData) {
      return NextResponse.json(
        { error: 'Trip data is required' },
        { status: 400 }
      );
    }

    console.log('Enriching trip data:', tripData);

    const enrichmentService = new TripEnrichmentService();
    const enrichedData = await enrichmentService.enrichTripData(tripData);

    console.log('Trip data enriched successfully');

    return NextResponse.json({
      success: true,
      enrichedData
    });

  } catch (error: any) {
    console.error('Error enriching trip data:', error);
    return NextResponse.json(
      { 
        error: error.message || 'Failed to enrich trip data',
        success: false
      },
      { status: 500 }
    );
  }
}
