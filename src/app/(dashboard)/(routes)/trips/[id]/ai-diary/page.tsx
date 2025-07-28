'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { usePOAssistant } from '@/contexts/POAssistantContext';
import { createClient } from '@/utils/supabase/client';

// Initialize Supabase client for this component
const supabase = createClient();
import { Button } from '@/components/ui/Button';

interface Trip {
  id: string;
  title: string;
  destination: string;
  start_date: string;
  end_date: string;
  description: string;
  status: string;
  user_id: string;
}

interface ItineraryDay {
  id: string;
  day_number: number;
  date: string;
  title: string;
  description: string;
  activities: string[];
  accommodation?: string;
  notes?: string;
}

export default function AIDiaryPage() {
  const params = useParams();
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [itinerary, setItinerary] = useState<ItineraryDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { setContext, showPO } = usePOAssistant();
  const tripId = params.id as string;

  useEffect(() => {
    if (authLoading) return;
    
    if (!user) {
      router.push('/login');
      return;
    }

    fetchTripData();
  }, [user, authLoading, tripId]);

  // Set PO context when component mounts
  useEffect(() => {
    setContext('diary', tripId);
  }, [setContext, tripId]);

  const fetchTripData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch trip details
      const { data: tripData, error: tripError } = await supabase
        .from('trips')
        .select('*')
        .eq('id', tripId)
        .eq('user_id', user?.id)
        .single();

      if (tripError) {
        throw new Error(tripError.message);
      }

      if (!tripData) {
        throw new Error('Trip not found or access denied');
      }

      setTrip(tripData);

      // Fetch itinerary
      const { data: itineraryData, error: itineraryError } = await supabase
        .from('itineraries')
        .select('*')
        .eq('trip_id', tripId)
        .eq('user_id', user?.id)
        .order('day_number', { ascending: true });

      if (itineraryError) {
        console.error('Error fetching itinerary:', itineraryError);
      } else {
        setItinerary(itineraryData || []);
      }

    } catch (err) {
      console.error('Error fetching trip data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load trip');
    } finally {
      setLoading(false);
    }
  };

  const handleTripUpdate = async (updatedTripId: string) => {
    // Refresh the trip data when AI updates it
    if (updatedTripId === tripId) {
      await fetchTripData();
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Error</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={() => router.push('/trips')} className="bg-blue-500 hover:bg-blue-600 text-white">
            Back to Trips
          </Button>
        </div>
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-600 mb-4">Trip Not Found</h1>
          <Button onClick={() => router.push('/trips')} className="bg-blue-500 hover:bg-blue-600 text-white">
            Back to Trips
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{trip.title}</h1>
              <p className="text-gray-600">{trip.destination}</p>
              <p className="text-sm text-gray-500">
                {new Date(trip.start_date).toLocaleDateString()} - {new Date(trip.end_date).toLocaleDateString()}
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                AI Generated
              </span>
              <Button
                onClick={() => showPO()}
                className="bg-orange-500 hover:bg-orange-600 text-white"
              >
                Chat with PO Assistant
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid gap-8 grid-cols-1">
          
          {/* Trip Itinerary */}
          <div className="col-span-1">
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">Trip Itinerary</h2>
                <p className="text-gray-600 mt-1">Your AI-generated travel plan</p>
              </div>
              
              <div className="p-6">
                {itinerary.length > 0 ? (
                  <div className="space-y-6">
                    {itinerary.map((day) => (
                      <div key={day.id} className="border-l-4 border-purple-400 pl-6 pb-6">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="text-lg font-semibold text-gray-900">
                            Day {day.day_number}
                          </h3>
                          <span className="text-sm text-gray-500">
                            {new Date(day.date).toLocaleDateString()}
                          </span>
                        </div>
                        
                        {day.activities && day.activities.length > 0 && (
                          <div className="mb-4">
                            <h4 className="font-medium text-gray-700 mb-2">Activities:</h4>
                            <ul className="list-disc list-inside space-y-1">
                              {day.activities.map((activity, index) => (
                                <li key={index} className="text-gray-600">{activity}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        
                        {day.accommodation && (
                          <div className="mb-4">
                            <h4 className="font-medium text-gray-700 mb-1">Accommodation:</h4>
                            <p className="text-gray-600">{day.accommodation}</p>
                          </div>
                        )}
                        
                        {day.notes && (
                          <div className="mb-4">
                            <h4 className="font-medium text-gray-700 mb-1">Notes:</h4>
                            <p className="text-gray-600">{day.notes}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="text-gray-400 mb-4">
                      <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Itinerary Yet</h3>
                    <p className="text-gray-600 mb-4">Chat with PO to build your detailed itinerary!</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* PO Assistant Info */}
          <div className="col-span-1">
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="text-center">
                <div className="mb-4">
                  <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <svg className="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Chat with PO Assistant</h3>
                  <p className="text-gray-600 mb-4">
                    PO is available at the bottom of your screen to help you refine your itinerary, 
                    add activities, or answer any travel questions!
                  </p>
                  <Button
                    onClick={() => showPO()}
                    className="bg-orange-500 hover:bg-orange-600 text-white"
                  >
                    Open PO Assistant
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* PO Assistant is managed globally and will appear at bottom of screen */}
    </div>
  );
}
