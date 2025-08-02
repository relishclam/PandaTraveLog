import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

// Logger utility (avoid using emojis, keep logs readable in environments like terminals or CI)
const log = (...args: any[]) => {
  if (process.env.NODE_ENV === 'development') {
    console.log('[MIDDLEWARE]', ...args)
  }
}

// Removed diary path from protected
const protectedPaths = ['/dashboard', '/trips', '/profile']
const authPaths = ['/login', '/register', '/reset-password', '/auth']

export async function middleware(request: NextRequest) {
  const url = new URL(request.url)
  const pathname = url.pathname

  // Skip diary routes
  if (pathname.includes('/diary')) {
    return NextResponse.next()
  }

  log('Processing request for:', pathname)
  log('User-Agent:', request.headers.get('user-agent') || 'Unknown')

  // Ignore static files, API routes
  if (
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/images/') ||
    pathname === '/favicon.ico' ||
    pathname === '/sw.js' ||
    pathname === '/manifest.json' ||
    pathname.startsWith('/android-chrome-') ||
    pathname.startsWith('/apple-touch-') ||
    pathname.startsWith('/favicon-')
  ) {
    const staticRes = NextResponse.next()

    if (['/sw.js', '/manifest.json'].includes(pathname)) {
      staticRes.headers.set('Cache-Control', 'public, max-age=0, must-revalidate')
    }

    return staticRes
  }

  // Prevent redirect loops
  const redirectCount = parseInt(url.searchParams.get('rc') ?? '0')
  if (redirectCount > 2) {
    console.error('[MIDDLEWARE] Redirect loop detected for path:', pathname)
    return NextResponse.next()
  }

  try {
    let response = NextResponse.next()
    
    // Create supabase client using new SSR approach
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll().map(({ name, value }) => ({ name, value }))
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options)
            )
          },
        },
      }
    )
    
    // Get the session and validate it properly
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError) {
      console.error('[MIDDLEWARE] Session error:', sessionError);
    }
    
    // ENHANCED: Proper session validation with cleanup
    let hasValidSession = false;
    if (session) {
      // Check if session has expired
      const isExpired = session.expires_at && new Date(session.expires_at * 1000) <= new Date();
      if (!isExpired && session.access_token) {
        // Verify user is actually authenticated
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (!userError && user) {
          hasValidSession = true;
        } else {
          // Invalid user but session exists - force cleanup
          console.log('[MIDDLEWARE] Invalid user with session, forcing sign out');
          await supabase.auth.signOut();
        }
      } else {
        // Expired session - force cleanup
        console.log('[MIDDLEWARE] Expired session, forcing sign out');
        await supabase.auth.signOut();
      }
    }
    
    console.log('[MIDDLEWARE] Auth check:', { 
      pathname, 
      hasValidSession, 
      userId: session?.user?.id,
      sessionExpired: session?.expires_at ? new Date(session.expires_at * 1000) <= new Date() : 'no expiry',
      sessionError: sessionError?.message 
    });

    const isProtected = protectedPaths.some((path) => pathname.startsWith(path))
    const isAuthRoute = authPaths.some((path) => pathname.startsWith(path))

    // Add no-cache headers for protected/auth routes
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
    response.headers.set('Pragma', 'no-cache')
    response.headers.set('Expires', '0')

    // Special redirect on landing page - with PROPER validation
    if (pathname === '/') {
      if (!hasValidSession) {
        console.log('[MIDDLEWARE] No valid session on root, staying on landing page');
        return response;
      }
      console.log('[MIDDLEWARE] Authenticated user on root, redirecting to trips');
      return NextResponse.redirect(new URL('/trips', request.url));
    }

    // Block unauthorized access to protected pages - with PROPER validation
    if (isProtected && !hasValidSession) {
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('returnUrl', encodeURIComponent(pathname))
      loginUrl.searchParams.set('rc', String(redirectCount + 1))
      return NextResponse.redirect(loginUrl)
    }

    // If already authenticated and trying to visit auth pages, redirect - with PROPER validation
    if (isAuthRoute && hasValidSession) {
      const fromAuthAction = url.searchParams.get('fromAuthAction') === 'true'
      const authTime = url.searchParams.get('auth_time')
      const returnUrl = url.searchParams.get('returnUrl') || '/trips'

      if (authTime || fromAuthAction) {
        const redirectUrl = new URL(returnUrl, request.url)
        redirectUrl.searchParams.delete('fromAuthAction')
        redirectUrl.searchParams.delete('auth_time')
        return NextResponse.redirect(redirectUrl)
      }

      // Otherwise, allow the auth page to render
      return response
    }

    return response
  } catch (err: any) {
    console.error('[MIDDLEWARE] Unexpected error:', err?.message || err, err?.stack || 'No stack trace available')

    const safeFallback = protectedPaths.some((path) => pathname.startsWith(path))
      ? NextResponse.redirect(new URL('/login', request.url))
      : NextResponse.next()

    return safeFallback
  }
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|images|sw.js|manifest.json).)',
    '/login',
    '/register',
    '/auth/:path',
    '/api/:path*',
    '/manifest.json',
  ]
}