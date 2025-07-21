import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { User } from '@supabase/supabase-js';

interface AuthResult {
  user: User | null;
  supabase: any | null;
  session: any | null;
}

export async function getAuthenticatedUser(): Promise<AuthResult> {
  console.log('🔐 API Auth: Getting authenticated user...');
  
  try {
    const cookieStore = await cookies(); // ✅ FIXED: Await the cookies() call
    
    // Create Supabase client with proper cookie handling (same pattern as middleware)
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {
              // The `setAll` method was called from a Server Component.
              // This can be ignored if you have middleware refreshing
              // user sessions.
            }
          },
        },
      }
    );

    // Get session using the same method as middleware
    console.log('📡 API Auth: Getting session from Supabase...');
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.log('❌ API Auth: Session error:', error.message);
      return { user: null, supabase: null, session: null };
    }
    
    if (!session) {
      console.log('❌ API Auth: No session found');
      return { user: null, supabase: null, session: null };
    }
    
    if (!session.user) {
      console.log('❌ API Auth: Session found but no user');
      return { user: null, supabase: null, session: null };
    }
    
    console.log('✅ API Auth: User authenticated:', session.user.email);
    console.log('🔍 API Auth: User ID:', session.user.id);
    
    return { 
      user: session.user, 
      supabase, 
      session 
    };
    
  } catch (error) {
    console.error('💥 API Auth: Unexpected error:', error);
    return { user: null, supabase: null, session: null };
  }
}

// Helper function to create authenticated response
export function createAuthErrorResponse(message: string = 'Authentication required') {
  console.log('🚫 API Auth: Creating auth error response');
  return Response.json(
    { 
      success: false, 
      error: message,
      message // Some routes expect 'message', others expect 'error' 
    },
    { status: 401 }
  );
}

// Helper function to handle API errors consistently
export function createErrorResponse(error: any, statusCode: number = 500) {
  console.error('💥 API Error:', error);
  
  const message = error?.message || 'An unexpected error occurred';
  
  return Response.json(
    { 
      success: false, 
      error: message,
      message 
    },
    { status: statusCode }
  );
}

// Helper function to create success response
export function createSuccessResponse(data: any = {}) {
  console.log('✅ API Success response created');
  
  return Response.json({
    success: true,
    ...data
  });
}