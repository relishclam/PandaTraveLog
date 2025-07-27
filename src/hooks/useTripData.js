import { useState, useEffect, useCallback } from 'react';
import { supabaseClient as supabase } from '@/lib/supabase-client';

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
      // Get current user session to verify ownership
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Not authenticated');
      }

      const [tripResponse, accResponse, travelResponse, scheduleResponse] = await Promise.all([
        supabase.from('trips').select('*').eq('id', tripId).eq('user_id', user.id).single(),
        supabase.from('trip_accommodations').select('*').eq('trip_id', tripId),
        supabase.from('trip_travel_details').select('*').eq('trip_id', tripId),
        supabase.from('trip_schedules').select('*').eq('trip_id', tripId).order('day_number')
      ]);

      if (tripResponse.error) {
        if (tripResponse.error.code === 'PGRST116') {
          throw new Error('Trip not found');
        }
        throw tripResponse.error;
      }

      const tripData = tripResponse.data;
      if (!tripData) {
        throw new Error('Trip not found');
      }

      // Handle both array and single object responses
      const trip = Array.isArray(tripData) ? tripData[0] : tripData;
      if (!trip) {
        throw new Error('Trip not found');
      }

      setData({
        trip: trip,
        accommodations: accResponse.error ? [] : (accResponse.data || []),
        travelDetails: travelResponse.error ? [] : (travelResponse.data || []),
        dailySchedules: scheduleResponse.error ? [] : (scheduleResponse.data || [])
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