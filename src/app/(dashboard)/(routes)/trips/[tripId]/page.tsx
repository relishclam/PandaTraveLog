'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/Button';
import { useAuth } from '@/contexts/AuthContext';
import supabase from '@/lib/supabase';
import { formatDate } from '@/lib/utils';
import dynamic from 'next/dynamic';

// Dynamically import the map component to avoid SSR issues
const MapComponent = dynamic(
  () => import('@/components/maps/MapComponent'),
  { ssr: false }
);

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
  budget: number | null;
  notes: string | null;
  created_at: string;
};

type Location = {
  id: string;
  name: string;
  address: string;
  coords: {
    lat: number;
    lng: number;
  };
  place_id: string;
  day: number;
  order: number;
  notes: string | null;
};

export default function TripDetailsPage({ params }: { params: { tripId: string } }) {
  const { tripId } = params;
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div>Loading trip details...</div>
      </div>
    );
  }
  const [trip, setTrip] = useState<Trip | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('itinerary');
  const [pandaEmotion, setPandaEmotion] = useState<'happy' | 'thinking' | 'excited' | 'confused'>('excited');
  const [pandaMessage, setPandaMessage] = useState("Let's explore your trip details!");

  useEffect(() => {
    const fetchTripDetails = async () => {
      if (!user) return;

      try {
        setLoading(true);
        
        // Get trip details
        const { data: tripData, error: tripError } = await supabase
          .from('trips')
          .select('*')
          .eq('id', tripId)
          .eq('user_id', user.id)
          .single();

        if (tripError) throw tripError;
        
        if (!tripData) {
          router.push('/trips');
          return;
        }

        setTrip(tripData);
        
        // Get trip locations (for itinerary)
        const { data: locationData, error: locationsError } = await supabase
          .from('trip_locations')
          .select('*')
          .eq('trip_id', tripId)
          .order('day')
          .order('order');

        if (locationsError) throw locationsError;
        
        setLocations(locationData || []);
        
        if (locationData && locationData.length > 0) {
          setPandaMessage(`Your ${tripData.destination} trip is looking great! You have ${locationData.length} places to visit.`);
        } else {
          setPandaMessage(`Let's start planning your ${tripData.destination} adventure! Click 'Add Places' to get started.`);
        }
        
      } catch (err: any) {
        console.error('Error fetching trip details:', err);
        setError('Failed to load trip details');
        setPandaEmotion('confused');
        setPandaMessage('Oh no! I had trouble loading your trip details.');
      } finally {
        setLoading(false);
      }
    };

    fetchTripDetails();
  }, [user, tripId, router]);

  // Format date range for display
  const getDateRangeString = () => {
    if (!trip) return '';
    
    const startDate = formatDate(trip.start_date);
    const endDate = formatDate(trip.end_date);
    
    return `${startDate} - ${endDate}`;
  };
  
  // Calculate trip duration in days
  const getTripDuration = () => {
    if (!trip) return 0;
    
    const start = new Date(trip.start_date);
    const end = new Date(trip.end_date);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  };
  
  // Group locations by day for itinerary display
  const getLocationsByDay = () => {
    const days: { [key: number]: Location[] } = {};
    
    locations.forEach(location => {
      if (!days[location.day]) {
        days[location.day] = [];
      }
      days[location.day].push(location);
    });
    
    return days;
  };
  
  if (loading) {
    return (
      <div className="container mx-auto px-4 py-12 flex flex-col items-center justify-center">
        <div className="w-16 h-16 border-4 border-gray-200 border-t-backpack-orange rounded-full animate-spin mb-4"></div>
        <p className="text-gray-600">Loading trip details...</p>
      </div>
    );
  }
  
  if (error || !trip) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md mb-6">
          {error || 'Trip not found'}
        </div>
        <Button href="/trips" variant="outline">
          Back to My Trips
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Trip Header */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4">
          <div>
            <h1 className="text-3xl font-bold text-panda-black">{trip.title}</h1>
            <p className="text-gray-600">{trip.destination}</p>
          </div>
          
          <div className="mt-2 md:mt-0 flex items-center text-gray-600">
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
            <span>{getDateRangeString()} • {getTripDuration()} days</span>
          </div>
        </div>
        
        {trip.notes && (
          <div className="bg-bamboo-light p-3 rounded-md mb-4">
            <p className="text-gray-700">{trip.notes}</p>
          </div>
        )}
        
        <div className="flex flex-wrap gap-2">
          <Button
            href={`/trips/${tripId}/edit`}
            variant="outline"
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className="h-5 w-5 mr-2" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" 
              />
            </svg>
            Edit Trip
          </Button>
          
          <Button
            href={`/trips/${tripId}/places`}
            className="bg-backpack-orange hover:bg-backpack-orange/90 text-white"
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className="h-5 w-5 mr-2" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" 
              />
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" 
              />
            </svg>
            Add Places
          </Button>
          
          <Button
            href={`/trips/${tripId}/share`}
            variant="outline"
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className="h-5 w-5 mr-2" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" 
              />
            </svg>
            Share
          </Button>
        </div>
      </div>
      
      {/* Tabs Navigation */}
      <div className="bg-white rounded-lg shadow-md mb-6">
        <div className="flex border-b border-gray-200">
          <button
            className={`px-4 py-3 text-sm font-medium ${
              activeTab === 'itinerary'
                ? 'border-b-2 border-backpack-orange text-backpack-orange'
                : 'text-gray-600 hover:text-backpack-orange'
            }`}
            onClick={() => setActiveTab('itinerary')}
          >
            Itinerary
          </button>
          
          <button
            className={`px-4 py-3 text-sm font-medium ${
              activeTab === 'map'
                ? 'border-b-2 border-backpack-orange text-backpack-orange'
                : 'text-gray-600 hover:text-backpack-orange'
            }`}
            onClick={() => setActiveTab('map')}
          >
            Map
          </button>
          
          <button
            className={`px-4 py-3 text-sm font-medium ${
              activeTab === 'companions'
                ? 'border-b-2 border-backpack-orange text-backpack-orange'
                : 'text-gray-600 hover:text-backpack-orange'
            }`}
            onClick={() => setActiveTab('companions')}
          >
            Companions
          </button>
        </div>
        
        {/* Tab Content */}
        <div className="p-6">
          {/* Itinerary Tab */}
          {activeTab === 'itinerary' && (
            <div>
              {locations.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-600 mb-4">No places added to your itinerary yet.</p>
                  <Button
                    href={`/trips/${tripId}/places`}
                    className="bg-backpack-orange hover:bg-backpack-orange/90 text-white"
                  >
                    Add Places to Your Itinerary
                  </Button>
                </div>
              ) : (
                <div>
                  {Object.entries(getLocationsByDay()).map(([day, dayLocations]) => (
                    <div key={day} className="mb-8">
                      <h3 className="text-xl font-bold mb-4">Day {day}</h3>
                      
                      <div className="space-y-4">
                        {dayLocations.map((location, index) => (
                          <div key={location.id} className="flex bg-bamboo-light rounded-lg p-4">
                            <div className="flex-shrink-0 w-10 h-10 bg-backpack-orange text-white rounded-full flex items-center justify-center mr-4">
                              {index + 1}
                            </div>
                            
                            <div>
                              <h4 className="font-bold">{location.name}</h4>
                              <p className="text-gray-600 text-sm">{location.address}</p>
                              {location.notes && (
                                <p className="text-gray-700 text-sm mt-2">{location.notes}</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          
          {/* Map Tab */}
          {activeTab === 'map' && (
            <div className="h-96">
              <MapComponent
                center={trip.destination_coords}
                markers={locations.map(loc => ({
                  position: loc.coords,
                  title: loc.name
                }))}
                zoom={12}
              />
            </div>
          )}
          
          {/* Companions Tab */}
          {activeTab === 'companions' && (
            <div>
              <p className="text-gray-600 mb-4">Add friends and family to your trip.</p>
              <Button
                href={`/trips/${tripId}/companions`}
                className="bg-backpack-orange hover:bg-backpack-orange/90 text-white"
              >
                Add Travel Companions
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
