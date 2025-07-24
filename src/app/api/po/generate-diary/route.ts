// src/app/api/po/generate-diary/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { AIDiaryGenerator } from '@/services/ai-diary-generator';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(request: NextRequest) {
  try {
    const { conversationId, userId, tripId } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 401 }
      );
    }

    // Get conversation messages
    let conversation = [];
    
    if (conversationId) {
      // Get specific conversation by ID
      const { data: messages, error } = await supabaseAdmin
        .from('assistant_conversations')
        .select('*')
        .eq('id', conversationId)
        .eq('user_id', userId)
        .order('created_at', { ascending: true });

      if (error) {
        throw new Error(`Failed to fetch conversation: ${error.message}`);
      }

      conversation = messages.map(msg => ({
        id: msg.id,
        role: msg.role,
        content: msg.message,
        timestamp: new Date(msg.created_at)
      }));
    } else if (tripId) {
      // Get conversation for specific trip
      conversation = await AIDiaryGenerator.getTripConversation(tripId, userId);
    } else {
      // Get recent general conversation
      const { data: messages, error } = await supabaseAdmin
        .from('assistant_conversations')
        .select('*')
        .eq('user_id', userId)
        .is('trip_id', null)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        throw new Error(`Failed to fetch recent conversation: ${error.message}`);
      }

      conversation = messages.reverse().map(msg => ({
        id: msg.id,
        role: msg.role,
        content: msg.message,
        timestamp: new Date(msg.created_at)
      }));
    }

    if (conversation.length === 0) {
      return NextResponse.json(
        { error: 'No conversation found to generate diary from' },
        { status: 404 }
      );
    }

    // Generate trip diary from conversation
    const tripDiary = await AIDiaryGenerator.generateTripDiaryFromConversation(
      conversation,
      userId
    );

    if (!tripDiary) {
      return NextResponse.json(
        { error: 'Failed to generate trip diary from conversation' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      tripDiary,
      conversationLength: conversation.length,
      message: 'Trip diary generated successfully'
    });

  } catch (error) {
    console.error('Error in generate-diary API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { tripDiary, userId, conversationId } = await request.json();

    if (!userId || !tripDiary) {
      return NextResponse.json(
        { error: 'User ID and trip diary are required' },
        { status: 400 }
      );
    }

    // Save the generated trip diary to database
    const tripId = await AIDiaryGenerator.saveTripDiary(
      tripDiary,
      userId,
      conversationId
    );

    if (!tripId) {
      return NextResponse.json(
        { error: 'Failed to save trip diary' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      tripId,
      message: 'Trip diary saved successfully'
    });

  } catch (error) {
    console.error('Error saving trip diary:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
