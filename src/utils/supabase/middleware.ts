import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // Log cookie operations for debugging
          console.log(`[MIDDLEWARE] Setting ${cookiesToSet.length} cookies`);
          
          // Set cookies on both request and response
          cookiesToSet.forEach(({ name, value, options }) => {
            try {
              request.cookies.set(name, value);
              console.log(`[MIDDLEWARE] Set cookie on request: ${name}`);
            } catch (e) {
              console.error(`[MIDDLEWARE] Error setting cookie on request: ${name}`, e);
            }
          });
          
          // Create a new response with the updated request
          response = NextResponse.next({
            request,
          });
          
          // Set cookies on the response
          cookiesToSet.forEach(({ name, value, options }) => {
            try {
              response.cookies.set(name, value, {
                ...options,
                // Ensure cookies are properly set for cross-site usage
                sameSite: 'lax',
                secure: process.env.NODE_ENV === 'production',
                path: '/',
              });
              console.log(`[MIDDLEWARE] Set cookie on response: ${name}`);
            } catch (e) {
              console.error(`[MIDDLEWARE] Error setting cookie on response: ${name}`, e);
            }
          });
        },
      },
    }
  );

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  const {
    data: { session },
    error: sessionError
  } = await supabase.auth.getSession();
  
  // Log session status for debugging
  console.log(`[MIDDLEWARE] Session check: ${!!session}`, sessionError ? `Error: ${sessionError.message}` : '');
  if (session) {
    console.log(`[MIDDLEWARE] User authenticated: ${session.user.email}`);
    console.log(`[MIDDLEWARE] Session expires at: ${session.expires_at}`);
    
    // Verify session is not expired
    const now = Math.floor(Date.now() / 1000);
    const expiresAt = session.expires_at || 0;
    const isExpired = expiresAt < now;
    
    console.log(`[MIDDLEWARE] Session expired: ${isExpired} (now: ${now}, expires: ${expiresAt})`);
    
    if (!isExpired) {
      // Check for auth cookies after session verification
      const authCookies = request.cookies.getAll().filter(cookie => cookie.name.startsWith('sb-'));
      console.log(`[MIDDLEWARE] Auth cookies after session check: ${authCookies.length}`, 
        authCookies.map(c => ({ name: c.name, exists: !!c.value })));
      
      // Ensure cookies are properly set on the response
      authCookies.forEach(cookie => {
        if (cookie.value) {
          response.cookies.set(cookie.name, cookie.value, {
            sameSite: 'lax',
            secure: process.env.NODE_ENV === 'production',
            path: '/',
            maxAge: 60 * 60 * 24 * 7, // 1 week
            httpOnly: false, // Allow client-side access for auth state
          });
        }
      });
    }
  } else if (sessionError) {
    console.error(`[MIDDLEWARE] Session error: ${sessionError.message}`);
  }

  return response;
}
