import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export function useTripData(tripId) {
  const [data, setData] = useState({
    trip: null,
    accommodations: [],
    travelDetails: [],
    dailySchedules: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadData = useCallback(async () => {
    if (!tripId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const [tripResponse, accResponse, travelResponse, scheduleResponse] = await Promise.all([
        supabase.from('trips').select('*').eq('id', tripId).single(),
        supabase.from('accommodations').select('*').eq('trip_id', tripId),
        supabase.from('travel_details').select('*').eq('trip_id', tripId),
        supabase.from('trip_day_schedules').select('*').eq('trip_id', tripId).order('day_number')
      ]);

      if (tripResponse.error && tripResponse.error.code !== 'PGRST116') {
        throw tripResponse.error;
      }

      if (!tripResponse.data) {
        throw new Error('Trip not found');
      }

      if (Array.isArray(tripResponse.data) && tripResponse.data.length > 1) {
        throw new Error('Multiple trips found, please specify');
      }

      setData({
        trip: tripResponse.data,
        accommodations: accResponse.data || [],
        travelDetails: travelResponse.data || [],
        dailySchedules: scheduleResponse.data || []
      });
    } catch (err) {
      setError(err.message);
      console.error('Error loading trip data:', err);
    } finally {
      setLoading(false);
    }
  }, [tripId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return { data, loading, error, reload: loadData };
}