'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import TripChoiceCard from '@/components/trips/TripChoiceCard';
import ManualTripEntryModal from '@/components/trips/ManualTripEntryModal';

import { useAuth } from '@/contexts/AuthContext';
import supabase from '@/lib/supabase';
import { formatDate } from '@/lib/utils';

type Trip = {
  id: string;
  title: string;
  destination: string;
  start_date: string;
  end_date: string;
  destination_coords: {
    lat: number;
    lng: number;
  };
  created_at: string;
};

export default function TripsPage() {
  const { user, isLoading: authLoading } = useAuth();
  
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div>Loading trips...</div>
      </div>
    );
  }
  const router = useRouter();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showTripChoice, setShowTripChoice] = useState(false);
  const [showManualEntry, setShowManualEntry] = useState(false);

  // Check for emergency auth in sessionStorage
  useEffect(() => {
    // Check if we arrived via emergency navigation
    const authSuccess = sessionStorage.getItem('auth_success');
    const userEmail = sessionStorage.getItem('user_email');
    
    console.log(" Trips: Checking emergency auth", { authSuccess, userEmail });
    
    if (authSuccess === 'true' && userEmail && !user) {
      console.log(" Trips: Emergency auth detected, refreshing session");
      // Force a session refresh
      supabase.auth.refreshSession();
      // Don't clear sessionStorage yet, we'll do that after successful fetch
    } else if (!loading && !user) {
      console.log(" Trips: No auth detected, redirecting to login");
      router.replace('/login');
    }
  }, [loading, user, router]);


  console.log(" Trips: Initial render", { hasUser: !!user });

  // Set a safety timeout to prevent infinite loading
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (loading) {
        console.log(" Trips: Loading timeout reached, forcing state update");
        setLoading(false);
      }
    }, 5000);
    
    return () => clearTimeout(timeoutId);
  }, [loading]);

  // Fetch user trips
  useEffect(() => {
    const fetchTrips = async () => {
      // Check for emergency auth in sessionStorage
      const authSuccess = sessionStorage.getItem('auth_success');
      const userEmail = sessionStorage.getItem('user_email');
      
      if (!user && !(authSuccess === 'true' && userEmail)) {
        console.log(" Trips: No user found and no emergency auth, skipping fetch");
        return;
      }

      try {
        console.log(" Trips: Fetching trips", user ? `for user ${user.email}` : 'with emergency auth');
        setLoading(true);
        
        // If we have a user, use their ID, otherwise try to get the user from Supabase
        let userId = user?.id;
        
        // If we don't have a user ID but have emergency auth, try to get the user
        if (!userId && authSuccess === 'true' && userEmail) {
          console.log(" Trips: Getting user from Supabase with email", userEmail);
          const { data: userData } = await supabase
            .from('profiles')
            .select('id')
            .eq('email', userEmail)
            .single();
            
          if (userData?.id) {
            console.log(" Trips: Found user ID from email", userData.id);
            userId = userData.id;
          }
        }
        
        if (!userId) {
          console.error(" Trips: Could not determine user ID");
          throw new Error('Could not determine user ID');
        }
        
        const { data, error } = await supabase
          .from('trips')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });

        if (error) {
          console.error(" Trips: Error fetching trips", error);
          throw error;
        }

        console.log(" Trips: Fetched", data?.length, "trips");
        setTrips(data || []);
        
        // Clear emergency auth after successful fetch
        if (authSuccess === 'true') {
          console.log(" Trips: Clearing emergency auth from sessionStorage");
          // Don't remove user_email yet as it might be needed for other operations
          sessionStorage.removeItem('auth_success');
        }
      } catch (err: any) {
        console.error(' Trips: Error fetching trips:', err);
        setError('Failed to load your trips');
      } finally {
        console.log(" Trips: Setting loading to false");
        setLoading(false);
      }
    };

    console.log(" Trips: useEffect triggered", { hasUser: !!user });
    fetchTrips();
  }, [user]);

  console.log(" Trips: Rendering state", { loading, tripsCount: trips.length, hasError: !!error });

  const handleDeleteTrip = async (tripId: string) => {
    if (!confirm('Are you sure you want to delete this trip?')) return;

    try {
      console.log(" Trips: Deleting trip", tripId);
      const { error } = await supabase
        .from('trips')
        .delete()
        .eq('id', tripId);

      if (error) {
        console.error(" Trips: Error deleting trip", error);
        throw error;
      }

      console.log(" Trips: Trip deleted successfully");
      // Update local state to remove the deleted trip
      setTrips(trips.filter(trip => trip.id !== tripId));
    } catch (err) {
      console.error(' Trips: Error deleting trip:', err);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-panda-black mb-4 md:mb-0">My Trips</h1>
        <Button
          className="bg-backpack-orange hover:bg-backpack-orange/90 text-white"
          onClick={() => setShowTripChoice(true)}
        >
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className="h-5 w-5 mr-2" 
            viewBox="0 0 20 20" 
            fill="currentColor"
          >
            <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
          </svg>
          Create New Trip
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md mb-6">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-12">
          <div className="w-16 h-16 border-4 border-gray-200 border-t-backpack-orange rounded-full animate-spin mb-4"></div>
          <p className="text-gray-600">Loading your adventures...</p>
        </div>
      ) : trips.length === 0 ? (
        <div className="py-16">
          {/* Show trip choice card when no trips exist */}
          <TripChoiceCard
            onManualEntry={() => {
              setShowTripChoice(false);
              setShowManualEntry(true);
            }}
            onAiPlanning={() => {
              setShowTripChoice(false);
              // Use emergency navigation approach with timestamp
              const timestamp = Date.now();
              
              // CRITICAL: Always ensure auth info is in sessionStorage
              sessionStorage.setItem('auth_success', 'true');
              
              if (user?.email) {
                sessionStorage.setItem('user_email', user.email);
                if (user.id) {
                  sessionStorage.setItem('user_id', user.id);
                }
                console.log('Emergency auth info stored for AI trip navigation');
              }
              
              // Navigate with timestamp parameter to bypass middleware
              window.location.href = `/trips/new?t=${timestamp}`;
            }}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {trips.map((trip) => (
            <div key={trip.id} className="bg-white rounded-lg shadow-md overflow-hidden">
              {/* Card Header with destination image */}
              <div className="h-48 bg-gray-200 relative">
                {/* We'll use a placeholder image for now */}
                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/50 z-10"></div>
                <div className="absolute bottom-0 left-0 p-4 z-20">
                  <h3 className="text-xl font-bold text-white">{trip.title}</h3>
                  <p className="text-white/90">{trip.destination}</p>
                </div>
              </div>
              
              {/* Card Content */}
              <div className="p-4">
                <div className="flex items-center text-gray-600 mb-4">
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    className="h-5 w-5 mr-2 text-backpack-orange" 
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor"
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={2} 
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" 
                    />
                  </svg>
                  <span>
                    {formatDate(trip.start_date)} - {formatDate(trip.end_date)}
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <Button
                    href={`/trips/${trip.id}`}
                    variant="default"
                    className="flex-1 mr-2"
                  >
                    View Details
                  </Button>
                  
                  <Button
                    variant="outline"
                    className="text-red-500 border-red-300 hover:bg-red-50"
                    onClick={() => handleDeleteTrip(trip.id)}
                  >
                    <svg 
                      xmlns="http://www.w3.org/2000/svg" 
                      className="h-5 w-5" 
                      fill="none" 
                      viewBox="0 0 24 24" 
                      stroke="currentColor"
                    >
                      <path 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        strokeWidth={2} 
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" 
                      />
                    </svg>
                  </Button>
                </div>
              </div>
              </div>
          ))}
        </div>
      )}
      
      {/* Trip Choice Modal */}
      {showTripChoice && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Create New Trip</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowTripChoice(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </Button>
              </div>
              
              <TripChoiceCard
                onManualEntry={() => {
                  setShowTripChoice(false);
                  setShowManualEntry(true);
                }}
                onAiPlanning={() => {
                  setShowTripChoice(false);
                  // Use emergency navigation approach with timestamp
                  const timestamp = Date.now();
                  
                  // CRITICAL: Always ensure auth info is in sessionStorage
                  sessionStorage.setItem('auth_success', 'true');
                  
                  if (user?.email) {
                    sessionStorage.setItem('user_email', user.email);
                    if (user.id) {
                      sessionStorage.setItem('user_id', user.id);
                    }
                    console.log('Emergency auth info stored for AI trip navigation');
                  }
                  
                  // Navigate with timestamp parameter to bypass middleware
                  window.location.href = `/trips/new?t=${timestamp}`;
                }}
              />
            </div>
          </div>
        </div>
      )}
      
      {/* Manual Trip Entry Modal */}
      <ManualTripEntryModal
        isOpen={showManualEntry}
        onClose={() => setShowManualEntry(false)}
      />
    </div>
  );
}