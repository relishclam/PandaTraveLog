'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

// Initialize Supabase client for this component
const supabase = createClientComponentClient();
import { Button } from '@/components/ui/Button';
import TripChoiceCard from '@/components/trips/TripChoiceCard';
import ManualTripEntryModal from '@/components/trips/ManualTripEntryModal';
import TripTabs from '@/components/trips/TripTabs';
import { usePOAssistant } from '@/contexts/POAssistantContext';

interface Trip {
  id: string;
  title: string;
  destination: string;
  start_date: string;
  end_date: string;
  description: string;
  status: string;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export default function TripsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showTripChoice, setShowTripChoice] = useState(false);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const { showPO, setContext } = usePOAssistant();

  // ✅ SIMPLIFIED - Only check auth state from AuthContext
  useEffect(() => {
    if (authLoading) return;
    
    if (!user) {
      router.push('/login');
      return;
    }

    fetchTrips();
  }, [user, authLoading, router]);

  const fetchTrips = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('trips')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(error.message);
      }

      setTrips(data || []);
    } catch (err) {
      console.error('Error fetching trips:', err);
      setError(err instanceof Error ? err.message : 'Failed to load trips');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTrip = async (tripId: string) => {
    if (!confirm('Are you sure you want to delete this trip?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('trips')
        .delete()
        .eq('id', tripId)
        .eq('user_id', user?.id);

      if (error) {
        throw new Error(error.message);
      }

      // Remove from local state
      setTrips(trips.filter(trip => trip.id !== tripId));
    } catch (error) {
      console.error('Error deleting trip:', error);
      alert('Failed to delete trip. Please try again.');
    }
  };

  const handleTripChoiceSelect = (choice: 'manual' | 'ai') => {
    setShowTripChoice(false);
    if (choice === 'manual') {
      setShowManualEntry(true);
    } else {
      // Open unified PO assistant
      setContext('trip_creation');
      showPO();
    }
  };

  // ✅ Function to handle successful trip creation from modal
  const handleTripCreated = () => {
    // Refresh trips list when a trip is successfully created
    fetchTrips();
    setShowManualEntry(false);
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">Please sign in to view your trips.</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Trips</h1>
          <p className="text-gray-600 mt-2">Plan and manage your travel adventures</p>
        </div>
        <Button
          onClick={() => setShowTripChoice(true)}
          className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-medium"
        >
          Create New Trip
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      ) : error ? (
        <div className="text-center py-16">
          <div className="text-red-600 mb-4">Error: {error}</div>
          <Button onClick={fetchTrips} className="bg-blue-500 hover:bg-blue-600 text-white">
            Try Again
          </Button>
        </div>
      ) : trips.length === 0 ? (
        <div className="py-16">
          <TripChoiceCard
            onManualEntry={() => {
              setShowTripChoice(false);
              setShowManualEntry(true);
            }}
            onAiPlanning={() => {
              setShowTripChoice(false);
              setContext('trip_creation');
              showPO();
            }}
          />
        </div>
      ) : (
        <TripTabs trips={trips} onDeleteTrip={handleDeleteTrip} />
      )}
      
      {/* Trip Choice Modal */}
      {showTripChoice && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">How would you like to create your trip?</h2>
              <button
                onClick={() => setShowTripChoice(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <TripChoiceCard 
              onManualEntry={() => {
                setShowTripChoice(false);
                setShowManualEntry(true);
              }}
              onAiPlanning={() => {
                setShowTripChoice(false);
                setContext('trip_creation');
                showPO();
              }}
            />
          </div>
        </div>
      )}

      {/* Manual Trip Entry Modal */}
      {showManualEntry && (
        <ManualTripEntryModal
          isOpen={showManualEntry}
          onClose={() => setShowManualEntry(false)}
        />
      )}
    </div>
  );
}