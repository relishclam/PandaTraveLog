import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

// Paths that require authentication
const protectedPaths = ['/dashboard', '/trips', '/profile'];

// Paths that are part of the auth flow
const authPaths = ['/login', '/register', '/reset-password'];

export async function middleware(request: NextRequest) {
  // Create a base response
  let response = NextResponse.next();
  
  const url = new URL(request.url);
  
  // Create server-side Supabase client that can read cookies
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name) {
          return request.cookies.get(name)?.value;
        },
        set(name, value, options) {
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
        remove(name, options) {
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

  
  // Get the session using the cookies from the request
  const { data: { session } } = await supabase.auth.getSession();
  
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
  
  // If the path is protected and there's no session, redirect to login
  if (isProtectedPath && !session) {
    console.log('Middleware: Protected path accessed without session, redirecting to login');
    return NextResponse.redirect(new URL('/login', request.url));
  }
  
  // If the user is logged in and trying to access an auth page, redirect to trips
  if (isAuthPath && session) {
    console.log('Middleware: Auth page accessed with active session, redirecting to trips');
    return NextResponse.redirect(new URL('/trips', request.url));
  }
  
  return response;
}
