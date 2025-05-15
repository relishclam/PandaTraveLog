import { createClient } from '@supabase/supabase-js';

// These env variables need to be set in .env.local
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://xhdcccmzciblpbrcrnii.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Log missing environment variables but don't halt the build
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables');
}

// Use a dummy key for build environments if the real key is missing
const dummyKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRvYnljYXNlc3V3ZnBlZmxlZnRtayIsInJvbCI6ImFub24iLCJpYXQiOjE3MDk3OTk3OTMsImV4cCI6MjAyNTM3NTc5M30.dummy-key-for-build';

// Create client only if both URL and key are available, otherwise create a mock client
const supabase = createClient(
  supabaseUrl, 
  supabaseAnonKey || dummyKey, // Use dummy key if real key is missing
  {
    auth: {
      persistSession: false, // Don't persist session during build
      autoRefreshToken: false, // Don't auto refresh during build
    }
  }
);

export default supabase;
