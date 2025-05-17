'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { PandaAssistant } from '@/components/ui/PandaAssistant';
import { Button } from '@/components/ui/Button';
import { LocationSearch } from '@/components/maps/LocationSearch';
import { getPlaceDetails } from '@/lib/places-service';
import { useAuth } from '@/contexts/AuthContext';
import supabase from '@/lib/supabase';
import dynamic from 'next/dynamic';

// Dynamically import the map component to avoid SSR issues
const MapComponent = dynamic(
  () => import('@/components/maps/MapComponent'),
  { ssr: false }
);

type FormData = {
  title: string;
  startDate: string;
  endDate: string;
  budget?: string;
  notes?: string;
};

export default function NewTripPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div>Loading...</div>
      </div>
    );
  }
  const [step, setStep] = useState(1);
  const [destination, setDestination] = useState<any>(null);
  const [placeDetails, setPlaceDetails] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pandaEmotion, setPandaEmotion] = useState<'happy' | 'thinking' | 'excited' | 'confused'>('excited');
  const [pandaMessage, setPandaMessage] = useState("Hi there! Let's plan your adventure. Where would you like to go?");
  
  const { register, handleSubmit, formState: { errors }, watch } = useForm<FormData>();
  
  // Handle destination selection
  const handleDestinationSelect = async (place: any) => {
    setPandaEmotion('thinking');
    setPandaMessage(`Hmm, ${place.mainText}... Let me see what I can find!`);
    
    try {
      const details = await getPlaceDetails(place.placeId);
      setDestination(place);
      setPlaceDetails(details);
      
      setPandaEmotion('excited');
      setPandaMessage(`${place.mainText} is a great choice! Now let's set up your trip details.`);
      
      setStep(2);
    } catch (error) {
      console.error('Error fetching place details:', error);
      setPandaEmotion('confused');
      setPandaMessage("I'm having trouble finding information about this place. Could you try a different destination?");
      setError('Failed to load place details');
    }
  };
  
  // Handle form submission
  const onSubmit = async (data: FormData) => {
    if (!user || !destination || !placeDetails) return;
    
    setIsLoading(true);
    setError(null);
    setPandaEmotion('thinking');
    setPandaMessage('Creating your trip...');
    
    try {
      // Create new trip in database
      const { data: tripData, error } = await supabase
        .from('trips')
        .insert({
          user_id: user.id,
          title: data.title,
          start_date: data.startDate,
          end_date: data.endDate,
          budget: data.budget ? parseFloat(data.budget) : null,
          notes: data.notes,
          destination: destination.description,
          destination_coords: {
            lat: placeDetails.location.lat,
            lng: placeDetails.location.lng
          },
          place_id: destination.placeId
        })
        .select();
      
      if (error) throw error;
      
      setPandaEmotion('excited');
      setPandaMessage('Trip created! Now let\'s plan your itinerary!');
      
      // Navigate to the trip detail page
      router.push(`/trips/${tripData[0].id}`);
    } catch (err: any) {
      console.error('Error creating trip:', err);
      setError('Failed to create trip. Please try again.');
      setPandaEmotion('confused');
      setPandaMessage('Oh no! I had trouble saving your trip. Let\'s try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8 text-center">Plan Your New Adventure</h1>
      
      <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-lg p-6">
        {/* Step indicator */}
        <div className="flex items-center mb-8">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 1 ? 'bg-backpack-orange text-white' : 'bg-gray-200'}`}>1</div>
          <div className={`flex-1 h-1 mx-2 ${step >= 2 ? 'bg-backpack-orange' : 'bg-gray-200'}`}></div>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 2 ? 'bg-backpack-orange text-white' : 'bg-gray-200'}`}>2</div>
        </div>
        
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md">
            {error}
          </div>
        )}
        
        {/* Step 1: Choose Destination */}
        {step === 1 && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold">Where would you like to go?</h2>
            <LocationSearch onSelect={handleDestinationSelect} placeholder="Search for a destination(Country, City, etc)..." />
            
            {destination && (
              <div className="bg-green-50 p-4 rounded-md">
                <p className="font-medium">Selected: {destination.description}</p>
              </div>
            )}
          </div>
        )}
        
        {/* Step 2: Trip Details */}
        {step === 2 && (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                Trip Title
              </label>
              <input
                id="title"
                type="text"
                placeholder="e.g., Summer in Tokyo"
                {...register('title', { required: 'Trip title is required' })}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-backpack-orange focus:border-backpack-orange"
              />
              {errors.title && (
                <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>
              )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date
                </label>
                <input
                  id="startDate"
                  type="date"
                  {...register('startDate', { required: 'Start date is required' })}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-backpack-orange focus:border-backpack-orange"
                />
                {errors.startDate && (
                  <p className="mt-1 text-sm text-red-600">{errors.startDate.message}</p>
                )}
              </div>
              
              <div>
                <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-1">
                  End Date
                </label>
                <input
                  id="endDate"
                  type="date"
                  {...register('endDate', { required: 'End date is required' })}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-backpack-orange focus:border-backpack-orange"
                />
                {errors.endDate && (
                  <p className="mt-1 text-sm text-red-600">{errors.endDate.message}</p>
                )}
              </div>
            </div>
            
            <div>
              <label htmlFor="budget" className="block text-sm font-medium text-gray-700 mb-1">
                Budget (Optional)
              </label>
              <input
                id="budget"
                type="number"
                placeholder="Your estimated budget"
                {...register('budget')}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-backpack-orange focus:border-backpack-orange"
              />
            </div>
            
            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                Notes (Optional)
              </label>
              <textarea
                id="notes"
                placeholder="Any special requests or notes for your trip"
                rows={3}
                {...register('notes')}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-backpack-orange focus:border-backpack-orange"
              ></textarea>
            </div>
            
            {destination && placeDetails && (
              <div className="bg-bamboo-light p-4 rounded-md">
                <h3 className="font-medium mb-2">Your Selected Destination:</h3>
                <p className="mb-2">{destination.description}</p>
                
                <div className="h-64 rounded-md overflow-hidden">
                  <MapComponent 
                    center={{ 
                      lat: placeDetails.location.lat, 
                      lng: placeDetails.location.lng 
                    }}
                    markers={[{
                      position: {
                        lat: placeDetails.location.lat,
                        lng: placeDetails.location.lng
                      },
                      title: placeDetails.name
                    }]}
                    zoom={12}
                  />
                </div>
              </div>
            )}
            
            <div className="flex justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep(1)}
              >
                Back
              </Button>
              
              <Button
                type="submit"
                disabled={isLoading}
              >
                {isLoading ? 'Creating...' : 'Create Trip'}
              </Button>
            </div>
          </form>
        )}
      </div>
      
      <PandaAssistant
        emotion={pandaEmotion}
        message={pandaMessage}
        position="bottom-right"
        size="lg"
      />
    </div>
  );
}
