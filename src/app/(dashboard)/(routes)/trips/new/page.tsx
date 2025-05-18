// src/app/(dashboard)/(routes)/trips/new/page.tsx
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { PandaAssistant } from '@/components/ui/PandaAssistant';
import { PandaModal } from '@/components/ui/PandaModal';
import { LocationSearch } from '@/components/maps/LocationSearch';
import { useAuth } from '@/contexts/AuthContext';

// Simple button component
const Button = ({ 
  children, 
  onClick, 
  type = "button", 
  disabled = false,
  variant = "primary" 
}: { 
  children: React.ReactNode, 
  onClick?: () => void, 
  type?: "button" | "submit" | "reset",
  disabled?: boolean,
  variant?: "primary" | "outline"
}) => {
  const baseStyles = "px-4 py-2 rounded-md font-medium transition-colors";
  const variantStyles = variant === "primary" 
    ? "bg-orange-500 text-white hover:bg-orange-600 disabled:bg-orange-300" 
    : "border border-orange-500 text-orange-500 hover:bg-orange-50 disabled:border-orange-300 disabled:text-orange-300";
  
  return (
    <button 
      className={`${baseStyles} ${variantStyles}`}
      onClick={onClick}
      type={type}
      disabled={disabled}
    >
      {children}
    </button>
  );
};

// Simplified map component
const MapComponent = ({ center, markers, zoom }: { 
  center: { lat: number, lng: number }, 
  markers: Array<{ position: { lat: number, lng: number }, title: string }>,
  zoom: number
}) => {
  return (
    <div className="bg-gray-100 h-full w-full flex items-center justify-center">
      <p className="text-gray-500 text-center">
        <span className="block text-3xl mb-2">🗺️</span>
        Map view showing {markers.length} location{markers.length !== 1 ? 's' : ''}
      </p>
    </div>
  );
};

type FormData = {
  title: string;
  startDate: string;
  endDate: string;
  budget?: string;
  notes?: string;
};

type Destination = {
  description: string;
  placeId: string;
  mainText: string;
  secondaryText?: string;
  location: {
    lat: number;
    lng: number;
  };
  details?: any;
};

export default function NewTripPage() {
  const router = useRouter();
  
  // Use auth context (modify if needed for your specific auth implementation)
  const { user, isLoading: authLoading } = useAuth();
  
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div>Loading...</div>
      </div>
    );
  }

  const [step, setStep] = useState(1);
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [primaryDestination, setPrimaryDestination] = useState<Destination | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pandaEmotion, setPandaEmotion] = useState<'happy' | 'thinking' | 'excited' | 'confused'>('excited');
  const [pandaMessage, setPandaMessage] = useState("Hi there! Let's plan your adventure. Where would you like to go?");
  
  // Debug button to force modal display
  const [showDebugButtons, setShowDebugButtons] = useState(false);
  
  // Modal state
  const [showMultiDestModal, setShowMultiDestModal] = useState(false);
  
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>();
  
  // Handle primary destination selection
  const handleDestinationSelect = (place: any) => {
    console.log("handleDestinationSelect called with:", place);
    setPandaEmotion('thinking');
    setPandaMessage(`Hmm, ${place.mainText}... Let me see what I can find!`);
    
    try {
      // Set as primary destination
      setPrimaryDestination(place);
      
      // Add to destinations array
      setDestinations([place]);
      
      // Show multi-destination modal after a short delay
      setTimeout(() => {
        console.log("Showing multi-destination modal");
        setShowMultiDestModal(true);
        // Turn on debug mode if modal doesn't appear
        setTimeout(() => setShowDebugButtons(true), 2000);
      }, 500);
      
      setPandaEmotion('excited');
    } catch (error) {
      console.error('Error processing destination:', error);
      setPandaEmotion('confused');
      setPandaMessage("I'm having trouble finding information about this place. Could you try a different destination?");
      setError('Failed to load place details');
    }
  };
  
  // Add another destination
  const addDestination = (place: any) => {
    console.log("Adding destination:", place);
    setDestinations(prev => [...prev, place]);
  };
  
  // Remove a destination
  const removeDestination = (index: number) => {
    setDestinations(prev => {
      const newDestinations = [...prev];
      newDestinations.splice(index, 1);
      return newDestinations;
    });
    
    // If primary destination is removed, set the next one as primary
    if (index === 0 && destinations.length > 1) {
      setPrimaryDestination(destinations[1]);
    }
  };
  
  // Multi-destination modal handlers
  const handleAddMoreDestinations = () => {
    console.log("User chose to add more destinations");
    setShowMultiDestModal(false);
    setPandaMessage(`Great! You can add more destinations now. ${primaryDestination?.mainText} is your primary destination.`);
  };
  
  const handleFinishDestinations = () => {
    console.log("User chose to finish with one destination");
    setShowMultiDestModal(false);
    setStep(2);
    setPandaMessage(`Perfect! Let's set up your trip to ${primaryDestination?.mainText}.`);
  };
  
  // Handle form submission
  const onSubmit = async (data: FormData) => {
    if (!user || !primaryDestination || destinations.length === 0) return;
    
    setIsLoading(true);
    setError(null);
    setPandaEmotion('thinking');
    setPandaMessage('Creating your trip...');
    
    try {
      // Mock API call - replace with your actual API call
      console.log('Creating trip:', {
        user_id: user.id,
        title: data.title,
        start_date: data.startDate,
        end_date: data.endDate,
        budget: data.budget ? parseFloat(data.budget) : null,
        notes: data.notes,
        destination: primaryDestination.description,
        destination_coords: primaryDestination.location,
        place_id: primaryDestination.placeId,
        additional_destinations: destinations.length > 1 ? 
          destinations.slice(1).map(d => ({
            description: d.description,
            place_id: d.placeId,
            coords: d.location
          })) : 
          []
      });
      
      // Simulate successful creation
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setPandaEmotion('excited');
      setPandaMessage("Trip created! Now let's plan your itinerary!");
      
      // Navigate to the trip detail page
      setTimeout(() => {
        router.push(`/trips`);
      }, 1000);
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
      
      {showDebugButtons && (
        <div className="max-w-3xl mx-auto mb-4 p-2 bg-red-100 border border-red-300 rounded-md">
          <h3 className="font-bold">Debug Controls:</h3>
          <div className="flex space-x-2 mt-2">
            <button 
              onClick={() => setShowMultiDestModal(true)} 
              className="bg-red-500 text-white px-3 py-1 rounded text-sm"
            >
              Force Show Modal
            </button>
            <button 
              onClick={() => setStep(step === 1 ? 2 : 1)} 
              className="bg-blue-500 text-white px-3 py-1 rounded text-sm"
            >
              Toggle Step: {step === 1 ? "1→2" : "2→1"}
            </button>
          </div>
        </div>
      )}
      
      <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-lg p-6">
        {/* Step indicator */}
        <div className="flex items-center mb-8">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 1 ? 'bg-orange-500 text-white' : 'bg-gray-200'}`}>1</div>
          <div className={`flex-1 h-1 mx-2 ${step >= 2 ? 'bg-orange-500' : 'bg-gray-200'}`}></div>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 2 ? 'bg-orange-500 text-white' : 'bg-gray-200'}`}>2</div>
        </div>
        
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md">
            {error}
          </div>
        )}
        
        {/* Step 1: Choose Destination(s) */}
        {step === 1 && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold">Where would you like to go?</h2>
            
            {/* Primary destination search */}
            {destinations.length === 0 ? (
              <LocationSearch 
                onSelect={handleDestinationSelect}
                placeholder="Search for a destination (country, city, etc)..."
                focusOnLoad={true}
                id="primary-destination"
              />
            ) : (
              <div>
                <h3 className="text-lg font-medium mb-2">Your destinations:</h3>
                <div className="space-y-3">
                  {destinations.map((dest, index) => (
                    <div key={`${dest.placeId}-${index}`} className="flex items-center bg-green-50 p-3 rounded-lg">
                      <div className="flex-1">
                        <div className="font-medium">
                          {index === 0 ? '🌟 ' : '📍'}{dest.mainText}
                        </div>
                        {dest.secondaryText && (
                          <div className="text-sm text-gray-600">{dest.secondaryText}</div>
                        )}
                      </div>
                      
                      {/* Don't allow removing the last destination */}
                      {(destinations.length > 1 || index > 0) && (
                        <button
                          onClick={() => removeDestination(index)}
                          className="text-red-500 hover:text-red-700 p-1"
                          type="button"
                          aria-label="Remove destination"
                        >
                          <span className="text-xl">🗑️</span>
                        </button>
                      )}
                    </div>
                  ))}
                  
                  {/* Add another destination */}
                  <div className="mt-4">
                    <h3 className="text-lg font-medium mb-2">Add another destination:</h3>
                    <LocationSearch 
                      onSelect={addDestination}
                      placeholder="Search for another destination..."
                      id="additional-destination"
                    />
                  </div>
                  
                  <div className="flex justify-end mt-4">
                    <Button onClick={() => setStep(2)}>
                      Continue to Trip Details
                    </Button>
                  </div>
                </div>
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
                placeholder={`Trip to ${primaryDestination?.mainText || 'destination'}`}
                {...register('title', { required: 'Trip title is required' })}
                className="w-full p-2 border border-gray-300 rounded-md"
              />
              {errors.title && (
                <p className="mt-1 text-sm text-red-600">{errors.title?.message}</p>
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
                  className="w-full p-2 border border-gray-300 rounded-md"
                />
                {errors.startDate && (
                  <p className="mt-1 text-sm text-red-600">{errors.startDate?.message}</p>
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
                  className="w-full p-2 border border-gray-300 rounded-md"
                />
                {errors.endDate && (
                  <p className="mt-1 text-sm text-red-600">{errors.endDate?.message}</p>
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
                className="w-full p-2 border border-gray-300 rounded-md"
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
                className="w-full p-2 border border-gray-300 rounded-md"
              ></textarea>
            </div>
            
            {primaryDestination && (
              <div className="bg-green-50 p-4 rounded-md">
                <h3 className="font-medium mb-2">Your Destinations:</h3>
                <div className="space-y-2 mb-4">
                  {destinations.map((dest, i) => (
                    <div key={`summary-${dest.placeId}-${i}`} className="flex items-center">
                      <span className="mr-2">{i === 0 ? '🌟' : '📍'}</span>
                      <span>{dest.description}</span>
                    </div>
                  ))}
                </div>
                
                {/* Map with all destinations */}
                <div className="h-64 rounded-md overflow-hidden">
                  <MapComponent 
                    center={primaryDestination.location}
                    markers={destinations.map(dest => ({
                      position: dest.location,
                      title: dest.mainText
                    }))}
                    zoom={destinations.length > 1 ? 5 : 10}
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
      
      {/* Panda Assistant */}
      <PandaAssistant
        emotion={pandaEmotion}
        message={pandaMessage}
        position="bottom-right"
        size="lg"
      />
      
      {/* Multi-destination Modal */}
      <PandaModal
        isOpen={showMultiDestModal}
        onClose={() => {
          setShowMultiDestModal(false);
          setStep(2);
        }}
        title="Plan Your Adventure"
        message={`Great choice! ${primaryDestination?.mainText} sounds amazing! Do you want to add more destinations to your trip?`}
        emotion="excited"
        primaryAction={{
          text: "Yes, add more destinations",
          onClick: handleAddMoreDestinations
        }}
        secondaryAction={{
          text: "No, continue with this destination",
          onClick: handleFinishDestinations
        }}
      >
        <div className="bg-white bg-opacity-70 rounded-lg p-3 shadow-inner">
          <p className="text-sm text-gray-700 mb-2">
            Multi-destination trips let you plan a complete adventure with stops in different locations.
          </p>
          <div className="flex items-center gap-2 text-sm font-medium text-orange-500">
            <span>✨</span>
            <span>Add as many destinations as you like</span>
          </div>
        </div>
      </PandaModal>
    </div>
  );
}