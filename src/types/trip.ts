// Shared Trip interface for the entire application
export interface Trip {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  start_date: string;  // Required - will provide fallback in fetchTrips
  end_date: string;    // Required - will provide fallback in fetchTrips
  destination: string; // Required - will provide fallback in fetchTrips
  budget?: number;
  currency?: string;
  status: 'planning' | 'active' | 'completed' | 'cancelled';
  is_public?: boolean;
  created_at: string;
  updated_at: string;
  cover_image_url?: string;
  destination_city?: string;
  destination_country?: string;
  destination_lat?: number;
  destination_lng?: number;
  destination_name?: string;
  interests?: string;
  place_id?: string;
  
  // Computed/derived fields for UI compatibility
  accommodation?: string;
  transportation?: string;
  activities?: string[];
  notes?: string;
  is_ai_generated?: boolean;
}
