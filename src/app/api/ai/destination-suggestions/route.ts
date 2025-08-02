import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { query, context } = await request.json();

    // Use OpenRouter API for destination suggestions
    const prompt = `
You are a travel expert AI assistant. Based on the following trip context, suggest 3-5 destinations that would be perfect for this trip:

Trip Context:
- Trip Name: ${context.tripName || 'Not specified'}
- Dates: ${context.startDate} to ${context.endDate}
- Budget Range: ${context.budget || 'Not specified'}
- Interests: ${context.interests?.join(', ') || 'Not specified'}
- Query: ${query}

For each destination, provide:
1. Name and country
2. Why it fits this trip
3. Best time to visit (considering their travel dates)
4. Estimated budget category (budget/mid-range/luxury)
5. Key attractions/activities
6. Local currency information

Respond in JSON format:
{
  "destinations": [
    {
      "name": "destination name",
      "country": "country name",
      "reasoning": "why this fits the trip",
      "bestTimeToVisit": "season/month info",
      "budgetCategory": "budget/mid-range/luxury",
      "keyAttractions": ["attraction1", "attraction2", "attraction3"],
      "currency": {
        "code": "USD",
        "name": "US Dollar",
        "symbol": "$"
      },
      "estimatedDailyBudget": {
        "budget": 50,
        "midRange": 100,
        "luxury": 200
      }
    }
  ]
}`;

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPEN_ROUTER_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'anthropic/claude-3.5-sonnet',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenRouter API error: ${response.statusText}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;

    if (!content) {
      throw new Error('No content received from AI');
    }

    // Parse the JSON response
    const suggestions = JSON.parse(content);

    // Enhance with Geoapify location data
    for (const destination of suggestions.destinations) {
      try {
        const geoResponse = await fetch(
          `https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(destination.name + ', ' + destination.country)}&apiKey=${process.env.GEOAPIFY_API_KEY}`
        );
        
        if (geoResponse.ok) {
          const geoData = await geoResponse.json();
          if (geoData.features && geoData.features.length > 0) {
            const feature = geoData.features[0];
            destination.coordinates = {
              lat: feature.geometry.coordinates[1],
              lng: feature.geometry.coordinates[0]
            };
            destination.address = feature.properties.formatted;
          }
        }
      } catch (geoError) {
        console.error('Geoapify error for destination:', destination.name, geoError);
      }
    }

    return NextResponse.json(suggestions);
  } catch (error) {
    console.error('Destination suggestions error:', error);
    return NextResponse.json(
      { error: 'Failed to generate destination suggestions' },
      { status: 500 }
    );
  }
}
