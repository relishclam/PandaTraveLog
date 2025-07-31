import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

class SupabaseService {
  private static instance: ReturnType<typeof createClient>;

  public static getInstance() {
    if (!SupabaseService.instance) {
      SupabaseService.instance = createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: true,
          storage: {
            getItem: (key) => {
              try {
                const value = localStorage.getItem(key);
                if (!value) return null;
                // Handle base64 encoded values
                if (value.startsWith('base64-')) {
                  return JSON.parse(atob(value.slice(7)));
                }
                return JSON.parse(value);
              } catch (e) {
                console.warn('Failed to parse stored value:', e);
                localStorage.removeItem(key);
                return null;
              }
            },
            setItem: (key, value) => {
              localStorage.setItem(key, JSON.stringify(value));
            },
            removeItem: (key) => {
              localStorage.removeItem(key);
            }
          }
        }
      });
    }
    return SupabaseService.instance;
  }
}

export const supabase = SupabaseService.getInstance();
