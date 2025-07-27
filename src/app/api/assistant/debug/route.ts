import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { OpenAI } from 'openai';

export async function GET(request: NextRequest) {
  try {
    const serviceChecks = {
      supabase: false,
      openRouter: false,
      pinecone: false,
      gemini: false
    };

    const errors: Record<string, string> = {};

    // Check Supabase connection
    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
      const { data, error } = await supabase.auth.getSession();
      if (!error) {
        serviceChecks.supabase = true;
      } else {
        errors.supabase = error.message;
      }
    } catch (e: any) {
      errors.supabase = e.message;
    }

    // Check OpenRouter connection
    try {
      const response = await fetch('https://openrouter.ai/api/v1/auth/key', {
        headers: {
          'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`
        }
      });
      if (response.ok) {
        serviceChecks.openRouter = true;
      } else {
        errors.openRouter = await response.text();
      }
    } catch (e: any) {
      errors.openRouter = e.message;
    }

    // Check Pinecone connection
    try {
      const response = await fetch('https://api.pinecone.io/indexes', {
        headers: {
          'Api-Key': process.env.PINECONE_API_KEY!
        }
      });
      if (response.ok) {
        serviceChecks.pinecone = true;
      } else {
        errors.pinecone = await response.text();
      }
    } catch (e: any) {
      errors.pinecone = e.message;
    }

    // Check Gemini connection
    try {
      const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models?key=' + process.env.GEMINI_API_KEY);
      if (response.ok) {
        serviceChecks.gemini = true;
      } else {
        errors.gemini = await response.text();
      }
    } catch (e: any) {
      errors.gemini = e.message;
    }

    return NextResponse.json({
      success: true,
      serviceStatus: serviceChecks,
      errors,
      environment: {
        supabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        supabaseServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        openRouterKey: !!process.env.OPENROUTER_API_KEY,
        pineconeKey: !!process.env.PINECONE_API_KEY,
        geminiKey: !!process.env.GEMINI_API_KEY
      }
    });

  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
