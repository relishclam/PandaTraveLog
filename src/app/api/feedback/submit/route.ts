import { NextRequest, NextResponse } from 'next/server';

interface FeedbackData {
  type: 'bug' | 'suggestion' | 'search_issue' | 'general';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  context?: any;
  timestamp: string;
}

interface FeedbackRequest {
  feedback: FeedbackData;
  aiAnalysis: boolean;
}

export async function POST(request: NextRequest) {
  try {
    const { feedback, aiAnalysis }: FeedbackRequest = await request.json();

    // Validate required fields
    if (!feedback.title || !feedback.description) {
      return NextResponse.json(
        { error: 'Title and description are required' },
        { status: 400 }
      );
    }

    // Store feedback in database (you can add Supabase integration here)
    const feedbackRecord = {
      ...feedback,
      id: `feedback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      status: 'submitted',
      created_at: new Date().toISOString()
    };

    // If AI analysis is requested, send to OpenRouter
    if (aiAnalysis) {
      try {
        await sendFeedbackToOpenRouter(feedback);
      } catch (error) {
        console.error('Failed to send feedback to OpenRouter:', error);
        // Don't fail the entire request if AI analysis fails
      }
    }

    // Log feedback for development (you can replace with proper logging)
    console.log('📝 User Feedback Received:', {
      type: feedback.type,
      severity: feedback.severity,
      title: feedback.title,
      timestamp: feedback.timestamp
    });

    return NextResponse.json({
      success: true,
      message: 'Feedback submitted successfully',
      feedbackId: feedbackRecord.id
    });

  } catch (error) {
    console.error('Error processing feedback:', error);
    return NextResponse.json(
      { error: 'Failed to process feedback' },
      { status: 500 }
    );
  }
}

async function sendFeedbackToOpenRouter(feedback: FeedbackData) {
  const openRouterApiKey = process.env.OPENROUTER_API_KEY;
  
  if (!openRouterApiKey) {
    console.warn('OpenRouter API key not found, skipping AI analysis');
    return;
  }

  const prompt = `
PANDATRAVELOG USER FEEDBACK ANALYSIS

Feedback Type: ${feedback.type}
Severity: ${feedback.severity}
Title: ${feedback.title}

Description:
${feedback.description}

Context:
${JSON.stringify(feedback.context, null, 2)}

Please analyze this user feedback and provide:
1. Root cause analysis (if it's a bug/issue)
2. Priority assessment 
3. Suggested solutions or improvements
4. Impact on user experience
5. Implementation recommendations

Focus on actionable insights that can help improve the PandaTravelLog application.
`;

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openRouterApiKey}`,
        'Content-Type': 'application/json',
        'X-Title': 'PandaTravelLog Feedback Analysis'
      },
      body: JSON.stringify({
        model: 'anthropic/claude-3.5-sonnet',
        messages: [
          {
            role: 'system',
            content: 'You are an AI assistant helping analyze user feedback for PandaTravelLog, a travel planning application. Provide detailed, actionable analysis to help improve the product.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 1000,
        temperature: 0.3
      })
    });

    if (!response.ok) {
      throw new Error(`OpenRouter API error: ${response.status}`);
    }

    const result = await response.json();
    const analysis = result.choices?.[0]?.message?.content;

    if (analysis) {
      // Log the AI analysis (you can store this in database or send to monitoring)
      console.log('🤖 AI Feedback Analysis:', {
        feedbackTitle: feedback.title,
        analysis: analysis.substring(0, 200) + '...',
        timestamp: new Date().toISOString()
      });

      // You could store this analysis in your database or send to a monitoring service
      // For now, we'll just log it
    }

  } catch (error) {
    console.error('Error sending feedback to OpenRouter:', error);
    throw error;
  }
}
