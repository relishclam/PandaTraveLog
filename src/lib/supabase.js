import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  },
  db: {
    schema: 'public',
  },
  global: {
    headers: {
      'x-my-custom-header': 'travel-panda',
    },
  },
});

// Helper functions
export const handleSupabaseError = (error) => {
  if (error?.code === '23505') {
    return 'This item already exists. Please try updating instead.';
  }
  if (error?.code === '23503') {
    return 'Invalid reference. Please check your data.';
  }
  if (error?.code === 'PGRST301') {
    return 'No permission to access this resource.';
  }
  return error?.message || 'An unexpected error occurred';
};

export const withRetry = async (operation, maxRetries = 3, delay = 1000) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
    }
  }
};