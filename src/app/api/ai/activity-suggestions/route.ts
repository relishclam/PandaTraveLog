import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { destination, date, context } = await request.json();

    const prompt = `
You are a local travel expert for ${destination}. Based on the following context, suggest 5-8 specific activities for this day of their trip:

Context:
- Destination: ${destination}
- Date: ${date}
- Day ${context.dayNumber} of ${context.totalDays} total days
- Trip: ${context.tripName}
- Interests: ${context.interests?.join(', ') || 'General sightseeing'}
- Budget: ${context.budget || 'Moderate'}

Consider:
1. Seasonal appropriateness for the date
2. Logical flow of activities throughout the day
3. Mix of must-see attractions and local experiences
4. Travel time between locations
5. Budget considerations
6. Day of the week (if applicable)

For each activity, provide:
- Name and brief description
- Estimated duration
- Best time of day
- Approximate cost
- Why it fits this trip

Respond in JSON format:
{
  "activities": [
    {
      "name": "activity name",
      "description": "brief description",
      "duration": "2-3 hours",
      "bestTime": "morning/afternoon/evening",
      "estimatedCost": "$10-20",
      "reasoning": "why this fits",
      "category": "sightseeing/food/culture/nature/adventure"
    }
  ],
  "dayOverview": "A brief summary of the perfect day in ${destination}",
  "localTips": ["tip1", "tip2", "tip3"],
  "transportation": "How to get around for these activities"
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

    const suggestions = JSON.parse(content);
    return NextResponse.json(suggestions);
  } catch (error) {
    console.error('Activity suggestions error:', error);
    return NextResponse.json(
      { error: 'Failed to generate activity suggestions' },
      { status: 500 }
    );
  }
}
