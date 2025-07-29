import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import type { CookieOptions } from '@supabase/ssr';
import { AuthError, Session, User } from '@supabase/supabase-js';

interface SessionValidationResult {
  isValid: boolean;
  errors: string[];
}

interface SessionExpiryCheck {
  isExpired: boolean;
  timeUntilExpiry: number;
}

interface AuthCookie {
  name: string;
  value: string;
}

interface AuthCookieValidation {
  authCookies: AuthCookie[];
  missingCookies: string[];
}

// Helper functions for session management
function validateSessionIntegrity(session: Session): SessionValidationResult {
  const errors: string[] = [];
  
  try {
    if (!session.user?.id) errors.push('Missing user ID');
    if (!session.user?.email) errors.push('Missing user email');
    if (!session.expires_at) errors.push('Missing expiration time');
    if (!session.access_token) errors.push('Missing access token');
    
    // Additional integrity checks
    if (session.user?.aud !== 'authenticated') errors.push('Invalid audience');
    if (!session.user?.role) errors.push('Missing user role');
    
    return {
      isValid: errors.length === 0,
      errors
    };
  } catch (error) {
    console.error('[Session Validation] Error validating session:', error);
    return {
      isValid: false,
      errors: ['Session validation failed: ' + (error instanceof Error ? error.message : 'Unknown error')]
    };
  }
}

function checkSessionExpiry(session: Session): SessionExpiryCheck {
  try {
    const now = Math.floor(Date.now() / 1000);
    const expiresAt = session.expires_at || 0;
    const timeUntilExpiry = expiresAt - now;
    
    return {
      isExpired: timeUntilExpiry <= 0,
      timeUntilExpiry
    };
  } catch (error) {
    console.error('[Session Expiry] Error checking session expiry:', error);
    return {
      isExpired: true,
      timeUntilExpiry: 0
    };
  }
}

function validateAuthCookies(cookieStore: { getAll: () => AuthCookie[] }): AuthCookieValidation {
  try {
    const requiredCookies = ['sb-access-token', 'sb-refresh-token'];
    const authCookies = cookieStore.getAll().filter((cookie: AuthCookie) => 
      cookie.name.startsWith('sb-')
    );
    
    const missingCookies = requiredCookies.filter(required => 
      !authCookies.some((cookie: AuthCookie) => cookie.name.includes(required))
    );
    
    return { authCookies, missingCookies };
  } catch (error) {
    console.error('[Cookie Validation] Error validating auth cookies:', error);
    return {
      authCookies: [],
      missingCookies: ['Error validating cookies']
    };
  }
}

// Function to check if request is a background request
function isBackgroundRequest(request: NextRequest): boolean {
  return request.headers.get('sec-fetch-mode') === 'cors' || 
         request.headers.get('x-requested-with') === 'XMLHttpRequest';
}

function calculateRemainingSessionTime(session: Session): number {
  try {
    const now = Math.floor(Date.now() / 1000);
    const expiresAt = session.expires_at || 0;
    const remainingTime = Math.max(0, expiresAt - now);
    
    // If remaining time is valid, use it; otherwise use default (7 days)
    if (remainingTime > 0 && remainingTime <= 60 * 60 * 24 * 30) { // Max 30 days
      return remainingTime;
    }
    
    // Default to 7 days if something's wrong
    return 60 * 60 * 24 * 7;
  } catch (error) {
    console.error('[Session Time] Error calculating session time:', error);
    return 60 * 60 * 24 * 7; // Return default on error
  }
}

export async function updateSession(request: NextRequest) {
  const startTime = Date.now();
  let response = NextResponse.next({
    request,
  });

  // Define base cookie options once to ensure consistency across all operations
  const baseCookieOptions: CookieOptions = {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    priority: 'high',
    maxAge: 60 * 60 * 24 * 7, // 7 days default
    domain: process.env.NODE_ENV === 'production' 
      ? process.env.NEXT_PUBLIC_COOKIE_DOMAIN 
      : undefined
  };

  // Function to get cookie options based on cookie type
  const getCookieOptions = (cookieName: string, maxAge?: number): CookieOptions => ({
    ...baseCookieOptions,
    httpOnly: cookieName.includes('access_token') || cookieName.includes('refresh_token'),
    maxAge: maxAge || baseCookieOptions.maxAge,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          const cookies = request.cookies.getAll();
          console.log('[MIDDLEWARE] Getting all cookies:', 
            cookies.map(c => ({ name: c.name, exists: !!c.value })));
          return cookies;
        },
        setAll(cookiesToSet) {
          // Enhanced cookie handling with better logging
          console.log(`[MIDDLEWARE] Setting ${cookiesToSet.length} cookies`);
          
          // Set cookies on both request and response
          cookiesToSet.forEach((cookie: { name: string; value: string; options?: any }) => {
            try {
              request.cookies.set(cookie.name, cookie.value);
              console.log(`[MIDDLEWARE] Set cookie on request: ${cookie.name}`);
            } catch (e) {
              console.error(`[MIDDLEWARE] Error setting cookie on request: ${cookie.name}`, e);
            }
          });
          
          // Create a new response with the updated request
          response = NextResponse.next({
            request,
          });
          
          // Set cookies on the response with proper options
          cookiesToSet.forEach((cookie: { name: string; value: string; options?: any }) => {
            try {
              const options = getCookieOptions(cookie.name);
              response.cookies.set(cookie.name, cookie.value, {
                ...options,
                ...cookie.options,
              });
              console.log(`[MIDDLEWARE] Set cookie on response: ${cookie.name}`, {
                httpOnly: options.httpOnly,
                secure: options.secure,
                maxAge: options.maxAge
              });
            } catch (e) {
              console.error(`[MIDDLEWARE] Error setting cookie on response: ${cookie.name}`, e);
            }
          });
        },
      },
    }
  );

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  try {
    const {
      data: { session: initialSession },
      error: sessionError
    } = await supabase.auth.getSession();
    
    // Enhanced session validation and logging with detailed error context
    // Enhanced debugging for session verification
    console.log(`[MIDDLEWARE] Session check started:`, {
      hasSession: !!initialSession,
      hasError: !!sessionError,
      url: request.url,
      path: request.nextUrl.pathname,
      isPageRefresh: request.headers.get('sec-fetch-mode') === 'navigate',
      timestamp: new Date().toISOString(),
      existingCookies: request.cookies.getAll()
        .filter(c => c.name.startsWith('sb-'))
        .map(c => ({ name: c.name, exists: !!c.value }))
    });
    
    if (sessionError) {
      console.error(`[MIDDLEWARE] Session error:`, {
        error: sessionError,
        path: request.nextUrl.pathname
      });
      return response;
    }
    
    if (!initialSession) {
      console.log('[MIDDLEWARE] No session found');
      return response;
    }
    
    // Track the current session state
    let currentSession = initialSession;
    
    // Enhanced session validation
    const sessionValidation = validateSessionIntegrity(currentSession);
    if (!sessionValidation.isValid) {
      console.error('[MIDDLEWARE] Session integrity check failed:', sessionValidation.errors);
      return response;
    }
    
    // Verify session is not expired or close to expiring
    const { isExpired, timeUntilExpiry } = checkSessionExpiry(currentSession);
    
    if (isExpired) {
      console.log(`[MIDDLEWARE] Session expired`, {
        user: currentSession.user.email,
        expiryTime: currentSession.expires_at
      });
      return response;
    }
    
      // Proactively refresh session if it's close to expiring
    if (timeUntilExpiry < 60 * 60) { // Less than 1 hour remaining
      const refreshStartTime = Date.now();
      const maxRetries = 2;
      let refreshAttemptError: Error | null = null;
      
      // Helper function to validate and process refreshed session
      const processRefreshedSession = async (session: Session): Promise<boolean> => {
        const validation = validateSessionIntegrity(session);
        if (!validation.isValid) {
          throw new Error(`Invalid refreshed session: ${validation.errors.join(', ')}`);
        }
        
        const currentExpiry = currentSession.expires_at || 0;
        const newExpiry = session.expires_at || 0;
        
        if (newExpiry <= currentExpiry) {
          throw new Error('Refreshed session is not newer than current session');
        }
        
        currentSession = session;
        return true;
      };
      
      try {
        // Attempt session refresh with retries
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
          try {
            if (attempt > 0) {
              const delay = attempt * 1000;
              console.log(`[MIDDLEWARE] Session refresh retry ${attempt}/${maxRetries} after ${delay}ms delay`);
              await new Promise(r => setTimeout(r, delay));
            }
            
            const result = await Promise.race([
              supabase.auth.refreshSession(),
              new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Refresh timeout')), 2000)
              )
            ]);
            
            const refreshResult = result as {
              data: { session: Session | null },
              error: Error | null
            };
            
            if (refreshResult.error) throw refreshResult.error;
            if (!refreshResult.data.session) throw new Error('No session in refresh response');
            
            // Process and validate the refreshed session
            const success = await processRefreshedSession(refreshResult.data.session);
            
            if (success) {
              console.log('[MIDDLEWARE] Session refreshed successfully', {
                attempt,
                duration: Date.now() - refreshStartTime,
                newExpiry: refreshResult.data.session.expires_at
              });
              break; // Exit the retry loop on success
            }
          } catch (error) {
            refreshAttemptError = error as Error;
            console.warn(`[MIDDLEWARE] Session refresh attempt ${attempt + 1}/${maxRetries + 1} failed:`, {
              error: refreshAttemptError.message,
              duration: Date.now() - refreshStartTime
            });
            
            if (attempt === maxRetries) {
              console.error('[MIDDLEWARE] All session refresh attempts failed', {
                finalError: refreshAttemptError.message,
                totalDuration: Date.now() - refreshStartTime
              });
              throw refreshAttemptError;
            }
          }
        }
      } catch (refreshError) {
        console.error('[MIDDLEWARE] Session refresh failed:', {
          error: refreshError,
          userId: currentSession.user.id.slice(0, 8),
          duration: Date.now() - refreshStartTime
        });
        // Continue with current session
      }
    }    // Comprehensive cookie management
    const { authCookies, missingCookies } = validateAuthCookies(request.cookies);
    
    if (missingCookies.length > 0) {
      console.warn('[MIDDLEWARE] Missing auth cookies:', missingCookies);
    }
    
    // Set or refresh all required auth cookies with atomic operations
    for (const cookie of authCookies) {
      if (cookie.value) {
        try {
          const maxAge = calculateRemainingSessionTime(currentSession);
          const options = getCookieOptions(cookie.name, maxAge);
          
          // Atomic cookie operation - set each cookie independently
          response.cookies.set(cookie.name, cookie.value, options);
          
          console.log(`[MIDDLEWARE] Cookie refreshed: ${cookie.name}`, {
            maxAge,
            httpOnly: options.httpOnly,
            secure: options.secure
          });
        } catch (e) {
          console.error(`[MIDDLEWARE] Cookie refresh failed:`, {
            cookie: cookie.name,
            error: e,
            sessionId: currentSession.user.id.slice(0, 8) // Log partial ID for debugging
          });
        }
      }
    }

    // Add performance metrics
    const duration = Date.now() - startTime;
    console.log(`[MIDDLEWARE] Session update completed in ${duration}ms`, {
      user: currentSession.user.email,
      expiresIn: timeUntilExpiry,
      cookiesUpdated: authCookies.length
    });

  } catch (error) {
    console.error('[MIDDLEWARE] Unhandled error in session update:', error);
  }

  return response;
}
