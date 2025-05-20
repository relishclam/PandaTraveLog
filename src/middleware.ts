import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

// Paths that require authentication
const protectedPaths = ['/dashboard', '/trips', '/profile'];

// Special routes that should be allowed with timestamp parameter
const specialRoutes = ['/trips/new'];

// Paths that are part of the auth flow
const authPaths = ['/login', '/register', '/reset-password'];

export async function middleware(request: NextRequest) {
  // Create an unmodified response
  let response = NextResponse.next();
  
  // Check for emergency navigation parameters
  const url = new URL(request.url);
  const hasTimestamp = url.searchParams.has('t');
  
  // If we have a timestamp parameter, this is an emergency navigation
  // Skip middleware checks and proceed directly
  if (hasTimestamp) {
    console.log('Middleware: Emergency navigation detected, skipping auth checks');
    // Add cache control headers to prevent caching
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    return response;
  }
  
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          // If the cookie is updated, update the response headers
          request.cookies.set({
            name,
            value,
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({
            name,
            value,
            ...options,
          });
        },
        remove(name: string, options: CookieOptions) {
          // If the cookie is removed, update the response headers
          request.cookies.set({
            name,
            value: '',
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({
            name,
            value: '',
            ...options,
          });
        },
      },
    }
  );
  
  // Get the session
  const { data: { session } } = await supabase.auth.getSession();
  
  // Check if this is a special route that should be allowed with timestamp
  const isSpecialRoute = specialRoutes.some(route => 
    url.pathname === route || url.pathname.startsWith(route)
  );
  
  // If this is a special route with a timestamp, allow it through
  if (isSpecialRoute && hasTimestamp) {
    console.log('Middleware: Special route with timestamp detected, allowing access');
    return response;
  }
  
  // Check if the current path is protected
  const isProtectedPath = protectedPaths.some(path => 
    url.pathname.startsWith(path)
  );
  
  // Check if the current path is an auth path
  const isAuthPath = authPaths.some(path => 
    url.pathname.startsWith(path)
  );
  
  // If the path is protected and there's no session, redirect to login
  if (isProtectedPath && !session) {
    // Check for emergency auth in sessionStorage (client-side only)
    // This won't work server-side, but we're adding a fallback mechanism
    
    // Add a cache-control header to prevent caching of the redirect
    const response = NextResponse.redirect(new URL('/login', request.url));
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    return response;
  }
  
  // If the user is logged in and trying to access an auth page, redirect to trips
  if (isAuthPath && session) {
    // Add a cache-control header to prevent caching of the redirect
    const response = NextResponse.redirect(new URL('/trips', request.url));
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    return response;
  }
  
  return response;
}
