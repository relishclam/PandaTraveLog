import { NextRequest, NextResponse } from 'next/server';
import supabase from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tripId = searchParams.get('tripId');
    const userId = request.headers.get('Authorization')?.replace('Bearer ', '');

    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    let query = supabase
      .from('assistant_conversations')
      .select('*')
      .eq('user_id', userId);

    // If tripId is provided, filter by trip context
    if (tripId) {
      // For now, we'll use context to identify trip-related conversations
      // Later we can add trip_id column if needed
      query = query.or(`context.eq.diary,context.eq.trip_creation,context.eq.manual_entry`);
    }

    const { data, error } = await query
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
      throw error;
    }

    return NextResponse.json({
      conversation: data || null
    });

  } catch (error) {
    console.error('Error fetching conversation:', error);
    return NextResponse.json(
      { error: 'Failed to fetch conversation', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { tripId, context, messages } = await request.json();
    const userId = request.headers.get('Authorization')?.replace('Bearer ', '');

    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const conversationData: any = {
      user_id: userId,
      context: context || 'general',
      messages: messages || [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Add trip_id if available and column exists
    if (tripId) {
      conversationData.trip_id = tripId;
    }

    const { data, error } = await supabase
      .from('assistant_conversations')
      .insert([conversationData])
      .select('*')
      .single();

    if (error) throw error;

    return NextResponse.json({
      conversation: data
    });

  } catch (error) {
    console.error('Error creating conversation:', error);
    return NextResponse.json(
      { error: 'Failed to create conversation', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
