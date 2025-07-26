import { createClient } from '@supabase/supabase-js';
import { createBrowserClient } from '@supabase/ssr';

// Check if we're in a browser environment
const isBrowser = typeof window !== 'undefined';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Create the appropriate client based on environment
const supabase = isBrowser
  ? createBrowserClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        // The browser client automatically handles cookies
        // and persists the session across page refreshes
        cookies: {
          get(name) {
            return document.cookie
              .split('; ')
              .find(row => row.startsWith(`${name}=`))
              ?.split('=')[1];
          },
          set(name, value, options) {
            let cookieString = `${name}=${value}`;
            if (options.maxAge) cookieString += `; Max-Age=${options.maxAge}`;
            if (options.domain) cookieString += `; Domain=${options.domain}`;
            if (options.path) cookieString += `; Path=${options.path}`;
            if (options.sameSite) cookieString += `; SameSite=${options.sameSite}`;
            if (options.secure) cookieString += `; Secure`;
            document.cookie = cookieString;
          },
          remove(name, options) {
            document.cookie = `${name}=; Max-Age=0; ${options.path ? `Path=${options.path}; ` : ''}${options.domain ? `Domain=${options.domain}; ` : ''}`;
          }
        }
      }
    )
  : createClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        auth: {
          persistSession: false, // Don't persist in non-browser environments
        }
      }
    );

export { supabase };
