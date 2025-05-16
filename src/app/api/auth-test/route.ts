import { NextResponse } from 'next/server';
import supabase from '@/lib/supabase';

export async function GET(request: Request) {
  try {
    // Check current session
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    
    // Get auth status
    let authStatus = {
      currentTime: new Date().toISOString(),
      hasSession: !!sessionData?.session,
      user: sessionData?.session?.user ? {
        id: sessionData.session.user.id,
        email: sessionData.session.user.email,
      } : null,
      sessionError: sessionError ? sessionError.message : null
    };
    
    return NextResponse.json({ 
      status: 'success', 
      authStatus 
    });
  } catch (error: any) {
    console.error('Auth test error:', error);
    return NextResponse.json({ 
      status: 'error',
      message: error.message
    }, { status: 500 });
  }
}