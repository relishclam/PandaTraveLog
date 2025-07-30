export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      trip_companions: {
        Row: {
          id: string
          trip_id: string
          user_id: string
          name: string
          email: string | null
          phone: string | null
          relationship: string | null
          emergency_contact: boolean
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          trip_id: string
          user_id: string
          name: string
          email?: string | null
          phone?: string | null
          relationship?: string | null
          emergency_contact?: boolean
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          trip_id?: string
          user_id?: string
          name?: string
          email?: string | null
          phone?: string | null
          relationship?: string | null
          emergency_contact?: boolean
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}

export default {} // Add this line to make the file a valid module
