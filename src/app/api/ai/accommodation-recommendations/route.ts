import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { destination, checkIn, checkOut, context } = await request.json();

    const prompt = `
You are a hotel and accommodation expert for ${destination}. Based on the following requirements, recommend the best accommodation options:

Requirements:
- Destination: ${destination}
- Check-in: ${checkIn}
- Check-out: ${checkOut}
- Budget: ${context.budget || 'Moderate'}
- Travel Style: ${context.travelStyle || 'Mid-range'}
- Interests: ${context.interests?.join(', ') || 'General tourism'}

Provide 4-6 accommodation recommendations across different price points and styles:

For each recommendation, include:
1. Name and type (hotel/hostel/apartment/etc.)
2. Neighborhood and why it's good for this trip
3. Estimated price range per night
4. Key amenities and features
5. Why it fits their travel style and interests
6. Booking recommendations

Consider:
- Location relative to main attractions
- Transportation accessibility
- Safety and neighborhood vibe
- Seasonal pricing factors
- Booking strategies for best rates

Respond in JSON format:
{
  "recommendations": [
    {
      "name": "accommodation name",
      "type": "hotel/hostel/apartment/guesthouse",
      "neighborhood": "area name",
      "priceRange": "$80-120 per night",
      "rating": "4.2/5",
      "keyFeatures": ["feature1", "feature2", "feature3"],
      "whyRecommended": "explanation for this trip",
      "location": {
        "description": "neighborhood description",
        "proximityToAttractions": "5 min walk to main square",
        "transportation": "Metro station 200m away"
      },
      "bookingTips": "book 2-3 weeks in advance for best rates",
      "category": "budget/mid-range/luxury"
    }
  ],
  "neighborhoodGuide": {
    "bestForFirstTime": "neighborhood name and why",
    "bestForNightlife": "neighborhood name and why",
    "bestForCulture": "neighborhood name and why",
    "bestForBudget": "neighborhood name and why"
  },
  "bookingStrategy": {
    "bestTimeToBook": "when to book for best rates",
    "platforms": ["recommended booking platforms"],
    "priceAlerts": "set alerts for $X range",
    "seasonalTips": "pricing insights for travel dates"
  },
  "localTips": [
    "local accommodation tip 1",
    "local accommodation tip 2",
    "local accommodation tip 3"
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
        max_tokens: 2500,
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

    const recommendations = JSON.parse(content);
    return NextResponse.json(recommendations);
  } catch (error) {
    console.error('Accommodation recommendations error:', error);
    return NextResponse.json(
      { error: 'Failed to generate accommodation recommendations' },
      { status: 500 }
    );
  }
}
