import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';

// Paths that require authentication - be more specific!
const protectedPaths = ['/dashboard', '/trips', '/profile'];

// Paths that are part of the auth flow
const authPaths = ['/login', '/register', '/reset-password'];

export async function middleware(request: NextRequest) {
  // Create a base response
  let response = NextResponse.next();
  
  const url = new URL(request.url);
  
  // Skip middleware for API routes - they handle their own auth
  if (url.pathname.startsWith('/api/')) {
    return response;
  }

  try {
    // Create middleware Supabase client that's compatible with auth-helpers
    const supabase = createMiddlewareClient({ req: request, res: response });

    // Get the session using the cookies from the request
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.log(`[MIDDLEWARE] Auth error: ${error.message}`);
    }
    
    // Check if the current path is protected
    const isProtectedPath = protectedPaths.some(path => 
      url.pathname.startsWith(path)
    );
    
    // Check if the current path is an auth path
    const isAuthPath = authPaths.some(path => 
      url.pathname.startsWith(path)
    );
    
    console.log(`[MIDDLEWARE] Path: ${url.pathname}, Protected: ${isProtectedPath}, Session: ${!!session}`);
    
    // Add cache control headers to prevent caching of auth-related responses
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    
    // If the path is protected and there's no session, redirect to login
    if (isProtectedPath && !session) {
      console.log('[MIDDLEWARE] Protected path accessed without session, redirecting to login');
      return NextResponse.redirect(new URL('/login', request.url));
    }
    
    // If the user is logged in and trying to access an auth page, redirect to trips
    if (isAuthPath && session) {
      console.log('[MIDDLEWARE] Auth page accessed with active session, redirecting to trips');
      return NextResponse.redirect(new URL('/trips', request.url));
    }
    
    return response;
    
  } catch (error: any) {
    console.error(`[MIDDLEWARE] Unexpected error: ${error.message}`);
    // On error, allow the request to proceed rather than breaking the app
    return response;
  }
}

// Configure middleware to exclude static assets and API routes
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes) - handled above with early return
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - images (your static images)
     * - sw.js (service worker)
     * - manifest.json (PWA manifest)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|images|sw.js|manifest.json).*)',
  ],
}