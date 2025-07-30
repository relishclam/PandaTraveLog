import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/types/supabase'

// Create a singleton instance to prevent multiple clients
let supabaseClient: ReturnType<typeof createClientComponentClient<Database>> | null = null

export function getSupabaseClient() {
  if (!supabaseClient) {
    supabaseClient = createClientComponentClient<Database>()
  }
  return supabaseClient
}

// Export the client for direct use
export const supabase = getSupabaseClient()
