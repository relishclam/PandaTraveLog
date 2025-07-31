import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Create the client with default config
const defaultClient = createSupabaseClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    storage: typeof window !== 'undefined' ? {
      getItem: (key) => {
        try {
          const itemStr = localStorage.getItem(key);
          if (!itemStr) return null;
          return JSON.parse(itemStr);
        } catch (e) {
          console.error('Failed to parse stored session:', e);
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
    } : undefined
  }
});

// Export both the default client and a function to create new clients
export const supabase = defaultClient;
export const createClient = () => defaultClient;
export default defaultClient;

// Additional type helpers (optional)
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];
export type Enums<T extends keyof Database['public']['Enums']> = Database['public']['Enums'][T];
export type Json = Database['public']['Tables']['profiles']['Row']['preferences'];