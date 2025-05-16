import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('query') || 'tokyo';
  
  console.log("🔍 API: debug-search called with query:", query);
  
  try {
    console.log("🔑 API: Debug search - checking API keys");
    console.log("   Maps API key available:", !!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY);
    console.log("   Places API key available:", !!process.env.GOOGLE_PLACES_API_KEY);
    console.log("   Gemini API key available:", !!process.env.GEMINI_API_KEY);
    
    // Log the API key length (not the actual key)
    if (process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY) {
      console.log("   Maps API key length:", process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY.length);
    }
    if (process.env.GOOGLE_PLACES_API_KEY) {
      console.log("   Places API key length:", process.env.GOOGLE_PLACES_API_KEY.length);
    }
    if (process.env.GEMINI_API_KEY) {
      console.log("   Gemini API key length:", process.env.GEMINI_API_KEY.length);
    }
    
    // Test Places API if key exists
    let placesResult = null;
    if (process.env.GOOGLE_PLACES_API_KEY) {
      console.log("📡 API: Testing Places API...");
      try {
        const placesUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${process.env.GOOGLE_PLACES_API_KEY}`;
        const placesResponse = await fetch(placesUrl);
        placesResult = await placesResponse.json();
        console.log("✅ API: Places API response received:", { 
          status: placesResult.status,
          resultsCount: placesResult.results?.length || 0
        });
      } catch (placeError) {
        console.error("❌ API: Places API error:", placeError);
        placesResult = { error: "Failed to fetch from Places API" };
      }
    }
    
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      query,
      apiKeysAvailable: {
        maps: !!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
        places: !!process.env.GOOGLE_PLACES_API_KEY,
        gemini: !!process.env.GEMINI_API_KEY
      },
      placesApiTest: placesResult ? {
        status: placesResult.status,
        resultsCount: placesResult.results?.length || 0
      } : null
    });
  } catch (error: any) {
    console.error("❌ API: Debug search error:", error);
    return NextResponse.json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}