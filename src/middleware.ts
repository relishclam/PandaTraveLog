import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { updateSession } from '@/utils/supabase/middleware';

// Paths that require authentication - be more specific!
const protectedPaths = ['/dashboard', '/trips', '/profile'];

// Paths that are part of the auth flow
const authPaths = ['/login', '/register', '/reset-password', '/auth'];

export async function middleware(request: NextRequest) {
  const url = new URL(request.url);
  
  // Debug: Log incoming request
  console.log('🚀 Middleware processing:', {
    url: url.pathname,
    search: url.search,
    referrer: request.headers.get('referer')
  });
  
  // Skip middleware for API routes, static assets, and other excluded paths
  if (
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/_next/') ||
    url.pathname.startsWith('/images/') ||
    url.pathname === '/favicon.ico' ||
    url.pathname === '/sw.js' ||
    url.pathname === '/manifest.json' ||
    url.pathname.startsWith('/android-chrome-') ||
    url.pathname.startsWith('/apple-touch-') ||
    url.pathname.startsWith('/favicon-')
  ) {
    const response = NextResponse.next();
    // Ensure PWA assets are properly cached
    if (url.pathname === '/sw.js' || url.pathname === '/manifest.json') {
      response.headers.set('Cache-Control', 'public, max-age=0, must-revalidate');
    }
    return response;
  }
  
  // Prevent redirect loops
  const redirectCount = parseInt(url.searchParams.get('rc') || '0');
  if (redirectCount > 2) {
    console.error('🚨 Redirect loop detected! Path:', url.pathname);
    return NextResponse.next();
  }

  try {
    console.log('🔄 Middleware: Processing request for:', url.pathname);
    
    // First update the session using the new middleware pattern
    const response = await updateSession(request);
    
    // Enhanced session detection with proper type safety
    const allCookies = request.cookies.getAll();
    console.log('🍪 Cookies found:', allCookies.length);
    
    const authCookies = allCookies.filter(cookie => 
      cookie.name.startsWith('sb-') && 
      (cookie.name.includes('access-token') || cookie.name.includes('refresh-token'))
    );
    console.log('🔑 Auth cookies found:', authCookies.length);

    const accessTokenCookie = authCookies.find(cookie => 
      cookie.name.includes('access-token')
    );
    const refreshTokenCookie = authCookies.find(cookie => 
      cookie.name.includes('refresh-token')
    );
    
    // Log auth status
    console.log('📝 Auth status:', {
      hasAccessToken: !!accessTokenCookie,
      hasRefreshToken: !!refreshTokenCookie,
      fromAuthAction: url.searchParams.get('fromAuthAction') === 'true'
    });
    
    // Validate both access and refresh tokens exist and have valid lengths
    const hasValidAccessToken = accessTokenCookie?.value && 
      accessTokenCookie.value.length > 10 && 
      accessTokenCookie.value !== 'undefined' &&
      accessTokenCookie.value !== 'null';
      
    const hasValidRefreshToken = refreshTokenCookie?.value && 
      refreshTokenCookie.value.length > 10 &&
      refreshTokenCookie.value !== 'undefined' &&
      refreshTokenCookie.value !== 'null';
      
    const hasSession = hasValidAccessToken && hasValidRefreshToken;
    
    // Only log in development to reduce console noise
    if (process.env.NODE_ENV === 'development') {
      console.log(`[MIDDLEWARE] Path: ${url.pathname}, Session: ${hasSession}`);
    }
    
    // Check if the current path is protected
    const isProtectedPath = protectedPaths.some(path => 
      url.pathname.startsWith(path)
    );
    
    // Check if the current path is an auth path
    const isAuthPath = authPaths.some(path => 
      url.pathname.startsWith(path)
    );
    
    // Add cache control headers to prevent caching of auth-related responses
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');

    // Log auth state for debugging
    console.log(`[MIDDLEWARE] Auth Check: Path=${url.pathname}, HasSession=${hasSession}, IsAuthPath=${isAuthPath}, IsProtectedPath=${isProtectedPath}`);
    
    // Handle root path redirection
    if (url.pathname === '/') {
      // Allow the root path to render normally if we don't have a session
      if (!hasSession) {
        return response;
      }
      // Only redirect to trips if we have a valid session
      if (hasSession) {
        const redirectResponse = NextResponse.redirect(new URL('/trips', request.url));
        redirectResponse.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
        return redirectResponse;
      }
    }
    
    // If the path is protected and there's no session, redirect to login
    if (isProtectedPath && !hasSession) {
      if (process.env.NODE_ENV === 'development') {
        console.log('[MIDDLEWARE] Protected path accessed without session, redirecting to login');
      }
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('returnUrl', url.pathname);
      
      // Add redirect counter to prevent loops
      const newRedirectCount = redirectCount + 1;
      loginUrl.searchParams.set('rc', newRedirectCount.toString());
      
      const redirectResponse = NextResponse.redirect(loginUrl);
      redirectResponse.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
      redirectResponse.headers.set('Pragma', 'no-cache');
      return redirectResponse;
    }
    
    // Enhanced redirect handling for authenticated users on auth pages
    if (isAuthPath && hasSession) {
      // Only redirect if coming from a specific auth action
      const fromAuthAction = url.searchParams.get('fromAuthAction') === 'true';
      
      if (fromAuthAction) {
        // Get the return URL or default to /trips
        const returnUrl = url.searchParams.get('returnUrl') || '/trips';
        
        if (process.env.NODE_ENV === 'development') {
          console.log(`[MIDDLEWARE] Auth page accessed with session, redirecting to ${returnUrl}`);
        }
        
        const redirectResponse = NextResponse.redirect(new URL(returnUrl, request.url));
        redirectResponse.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
        return redirectResponse;
      }
      
      // Allow the auth page to render normally if not from an auth action
      return response;
    }
    
    return response;
    
  } catch (error: any) {
    console.error(`[MIDDLEWARE] Unexpected error: ${error.message}`);
    
    // On error, check if we're on a protected path
    const isProtectedPath = protectedPaths.some(path => 
      url.pathname.startsWith(path)
    );
    
    // If error on protected path, redirect to login as safety measure
    if (isProtectedPath) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    
    // Otherwise, allow the request to proceed
    return NextResponse.next();
  }
}

// Configure middleware to exclude static assets and API routes
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - images (your static images)
     * - sw.js (service worker)
     * - manifest.json (PWA manifest)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|images|sw.js|manifest.json).*)',
    // Also match auth-related paths
    '/login',
    '/register',
    '/auth/:path*'
  ],
};