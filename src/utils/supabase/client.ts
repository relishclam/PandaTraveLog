import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Single instance to prevent multiple client warnings
let supabaseInstance: ReturnType<typeof createClient<Database>> | null = null;

const createSingletonClient = () => {
  if (supabaseInstance) return supabaseInstance;

  supabaseInstance = createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      storageKey: 'panda-auth-token',
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: typeof window !== 'undefined' ? {
        getItem: (key) => {
          try {
            const itemStr = localStorage.getItem(key);
            if (!itemStr) return null;
            // Handle both string and object session data
            return typeof itemStr === 'string' ? itemStr : JSON.stringify(itemStr);
          } catch (e) {
            console.error('Session parse error:', e);
            return null;
          }
        },
        setItem: (key, value) => {
          const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
          localStorage.setItem(key, stringValue);
        },
        removeItem: (key) => {
          localStorage.removeItem(key);
        }
      } : undefined
    }
  });

  return supabaseInstance;
};

export const supabase = createSingletonClient();
export default supabase;

// Additional type helpers (optional)
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];
export type Enums<T extends keyof Database['public']['Enums']> = Database['public']['Enums'][T];
export type Json = Database['public']['Tables']['profiles']['Row']['preferences'];