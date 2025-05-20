import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

// Paths that require authentication
const protectedPaths = ['/dashboard', '/trips', '/profile'];

// Paths that are part of the auth flow
const authPaths = ['/login', '/register', '/reset-password'];

export async function middleware(request: NextRequest) {
  // Create an unmodified response
  let response = NextResponse.next();
  
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
  const url = new URL(request.url);
  
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
    return NextResponse.redirect(new URL('/login', request.url));
  }
  
  // If the user is logged in and trying to access an auth page, redirect to trips
  if (isAuthPath && session) {
    return NextResponse.redirect(new URL('/trips', request.url));
  }
  
  return response;
}
