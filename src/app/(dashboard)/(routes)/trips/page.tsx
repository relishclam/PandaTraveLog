'use client';

import { useState, useEffect } from 'react';
import { Plus, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { Button } from '@/components/ui/Button';
import TripCard from '@/components/trips/TripCard';  // Use default import
import TripChoiceCard from '@/components/trips/TripChoiceCard';
import ManualTripEntryModal from '@/components/trips/ManualTripEntryModal';
import TripTabs from '@/components/trips/TripTabs';
import { InteractiveMapModal } from '@/components/map/InteractiveMapModal';
import { CreateTripModal } from '@/components/trips';
import { usePOAssistant } from '@/contexts/POAssistantContext';
import { PoGuide } from '@/components/po/svg/PoGuide';

// Initialize Supabase client for this component
const supabase = createClient();

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
  const [showMap, setShowMap] = useState(false);
  const [destination, setDestination] = useState('');
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

  // Enhanced loading and auth check logic
  useEffect(() => {
    if (authLoading) return;
    
    const checkAuthAndFetch = async () => {
      try {
        // Double-check session status
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          console.log("No active session found, redirecting to login");
          router.push('/login');
          return;
        }
        
        // If we have a session but no user in context, wait briefly and retry
        if (!user) {
          console.log("Session found but no user in context, waiting...");
          setTimeout(() => {
            if (!user) router.push('/login');
          }, 2000);
          return;
        }
        
        // We have both session and user, fetch trips
        await fetchTrips();
      } catch (err) {
        console.error("Error in auth check:", err);
        router.push('/login');
      }
    };
    
    checkAuthAndFetch();
  }, [user, authLoading]);

  const [isCreating, setIsCreating] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Add empty state component
  const EmptyState = () => (
    <div className="text-center py-12">
      <PoGuide 
        type="excited" 
        message="Ready to plan your next adventure?"
        size="large"
      />
      <Button
        onClick={() => setShowCreateModal(true)}
        className="mt-4 bg-backpack-orange hover:bg-backpack-orange/90"
      >
        Create Your First Trip
      </Button>
    </div>
  );

  // Add error state component
  const ErrorState = () => (
    <div className="text-center py-12">
      <PoGuide 
        type="sad" 
        message={error || "Something went wrong"}
        size="medium"
      />
      <Button
        onClick={() => fetchTrips()}
        variant="outline"
        className="mt-4"
      >
        Try Again
      </Button>
    </div>
  );

  const LoadingState = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[1, 2, 3].map((i) => (
        <div key={i} className="animate-pulse">
          <div className="h-48 bg-gray-200 rounded-lg"></div>
        </div>
      ))}
    </div>
  );

  if (authLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mb-4"></div>
        <div className="text-gray-600">Loading your trips...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-xl font-semibold mb-4">Please sign in to view your trips</div>
          <Button
            onClick={() => router.push('/login')}
            className="bg-blue-500 hover:bg-blue-600 text-white"
          >
            Sign In
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-bold">My Trips</h1>
          <PoGuide 
            type="happy" 
            message="Welcome back!" 
            size="small"
          />
        </div>
        <Button
          onClick={() => setShowCreateModal(true)}
          disabled={isCreating}
          className="bg-backpack-orange hover:bg-backpack-orange/90"
        >
          {isCreating ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Creating...
            </>
          ) : (
            <>
              <Plus className="w-4 h-4 mr-2" />
              Create New Trip
            </>
          )}
        </Button>
      </div>

      {/* Content */}
      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState />
      ) : trips.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {trips.map((trip) => (
            <TripCard
              key={trip.id}
              trip={trip}
              onDelete={async (tripId: string) => {  // Add type annotation
                setIsDeleting(tripId);
                await handleDeleteTrip(tripId);
                setIsDeleting(null);
              }}
              isDeleting={isDeleting === trip.id}
            />
          ))}
        </div>
      )}

      {/* Create Trip Modal */}
      <CreateTripModal 
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => {
          setShowCreateModal(false);
          fetchTrips();
        }}
      />
      
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

      {/* Interactive Map Modal */}
      <InteractiveMapModal 
        isOpen={showMap}
        onClose={() => setShowMap(false)}
        destination={destination}
      />
    </div>
  );
}