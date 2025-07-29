import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { updateSession } from '@/utils/supabase/middleware';

// Paths that require authentication - be more specific!
const protectedPaths = ['/dashboard', '/trips', '/profile'];

// Paths that are part of the auth flow
const authPaths = ['/login', '/register', '/reset-password'];

export async function middleware(request: NextRequest) {
  // Skip middleware for API routes - they handle their own auth
  const url = new URL(request.url);
  if (url.pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  try {
    // First update the session using the new middleware pattern
    const response = await updateSession(request);
    
    // Enhanced session detection with proper type safety
    const allCookies = request.cookies.getAll();
    const authCookies = allCookies.filter(cookie => 
      cookie.name.startsWith('sb-') && 
      (cookie.name.includes('access-token') || cookie.name.includes('refresh-token'))
    );

    const accessTokenCookie = authCookies.find(cookie => 
      cookie.name.includes('access-token')
    );
    const refreshTokenCookie = authCookies.find(cookie => 
      cookie.name.includes('refresh-token')
    );
    
    // Validate both access and refresh tokens exist and have valid lengths
    const hasValidAccessToken = accessTokenCookie?.value && accessTokenCookie.value.length > 10;
    const hasValidRefreshToken = refreshTokenCookie?.value && refreshTokenCookie.value.length > 10;
    const hasSession = hasValidAccessToken && hasValidRefreshToken;
    
    // Debug cookie information
    console.log(`[MIDDLEWARE] Auth cookies found: ${authCookies.length}`, 
      authCookies.map((c: { name: string; value: string }) => ({ 
        name: c.name, 
        hasValue: !!c.value, 
        length: c.value?.length || 0 
      })));
    console.log(`[MIDDLEWARE] Session detected: ${hasSession}`);
    
    // Check if the current path is protected
    const isProtectedPath = protectedPaths.some(path => 
      url.pathname.startsWith(path)
    );
    
    // Check if the current path is an auth path
    const isAuthPath = authPaths.some(path => 
      url.pathname.startsWith(path)
    );
    
    console.log(`[MIDDLEWARE] Path: ${url.pathname}, Protected: ${isProtectedPath}, Session: ${hasSession}`);
    
    // Add cache control headers to prevent caching of auth-related responses
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    
    // If the path is protected and there's no session, redirect to login
    if (isProtectedPath && !hasSession) {
      console.log('[MIDDLEWARE] Protected path accessed without session, redirecting to login');
      return NextResponse.redirect(new URL('/login', request.url));
    }
    
    // Enhanced redirect handling for authenticated users on auth pages
    if (isAuthPath && hasSession) {
      console.log('[MIDDLEWARE] Auth page accessed with active session');
      
      // Get the referrer to handle back navigation properly
      const referrer = request.headers.get('referer');
      const isFromProtectedPath = referrer && protectedPaths.some(path => referrer.includes(path));
      
      // If this is a direct access to the login page and we have a session
      if (!isFromProtectedPath && url.pathname === '/login') {
        console.log('[MIDDLEWARE] Direct access to login with session, redirecting to trips');
        
        // Use a more direct approach for redirection with absolute URL
        const baseUrl = new URL(request.url).origin;
        const redirectUrl = new URL('/trips', baseUrl);
        console.log(`[MIDDLEWARE] Redirecting to absolute URL: ${redirectUrl.toString()}`);
        
        // Set cache control headers to prevent caching of the redirect
        const redirectResponse = NextResponse.redirect(redirectUrl);
        redirectResponse.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        redirectResponse.headers.set('Pragma', 'no-cache');
        redirectResponse.headers.set('Expires', '0');
        
        // Add a custom header to track redirects
        redirectResponse.headers.set('X-Auth-Redirect', 'true');
        
        return redirectResponse;
      }
    }
    
    return response;
    
  } catch (error: any) {
    console.error(`[MIDDLEWARE] Unexpected error: ${error.message}`);
    // On error, allow the request to proceed rather than breaking the app
    return NextResponse.next();
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
