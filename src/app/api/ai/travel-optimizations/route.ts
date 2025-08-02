import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { destinations, context } = await request.json();

    const prompt = `
You are a travel logistics expert. Analyze these destinations and travel context to provide optimal travel arrangements:

Destinations: ${destinations.map((d: any) => d.name).join(' → ')}
Travel Period: ${context.startDate} to ${context.endDate}
Budget: ${context.budget || 'Moderate'}

For this multi-destination trip, provide:

1. Optimal route order (considering geography, logistics, and experiences)
2. Best transportation methods between destinations
3. Estimated travel times and costs
4. Booking recommendations and timing
5. Travel tips and considerations

Consider:
- Seasonal factors affecting transportation
- Cost optimization opportunities
- Time efficiency
- Comfort and convenience
- Local transportation options

Respond in JSON format:
{
  "optimizedRoute": [
    {
      "destination": "destination name",
      "order": 1,
      "reasoning": "why this order makes sense",
      "stayDuration": "recommended nights"
    }
  ],
  "transportationPlan": [
    {
      "from": "departure point",
      "to": "arrival point",
      "recommendedMethod": "flight/train/bus/car",
      "estimatedCost": "$100-200",
      "estimatedTime": "2-3 hours",
      "bookingTips": "when and how to book",
      "alternatives": ["alternative method 1", "alternative method 2"]
    }
  ],
  "budgetBreakdown": {
    "transportation": "$500-800",
    "accommodations": "$600-1200",
    "activities": "$300-600",
    "food": "$400-800",
    "total": "$1800-3400"
  },
  "travelTips": [
    "tip1",
    "tip2",
    "tip3"
  ],
  "bestBookingStrategy": "when to book flights, hotels, etc."
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

    const optimizations = JSON.parse(content);
    return NextResponse.json(optimizations);
  } catch (error) {
    console.error('Travel optimizations error:', error);
    return NextResponse.json(
      { error: 'Failed to generate travel optimizations' },
      { status: 500 }
    );
  }
}
