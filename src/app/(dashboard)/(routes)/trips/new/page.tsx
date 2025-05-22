// src/app/(dashboard)/(routes)/trips/new/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { PandaAssistant } from '@/components/ui/PandaAssistant';
import DestinationSearchWrapper from '@/components/maps/DestinationSearchWrapper';
import { useAuth } from '@/contexts/AuthContext';
import { usePandaAssistant } from '@/contexts/PandaAssistantContext';

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

// MapComponent implementation
const MapComponent = ({ center, markers, zoom }: { 
  center: { lat: number, lng: number }, 
  markers: Array<{ position: { lat: number, lng: number }, title: string }>,
  zoom: number
}) => {
  // Generate a static map URL using the OpenStreetMap static map API
  const generateMapUrl = () => {
    // Base URL
    let url = `https://maps.geoapify.com/v1/staticmap?style=osm-bright`;
    
    // Add markers
    markers.forEach((marker, index) => {
      url += `&marker=lonlat:${marker.position.lng},${marker.position.lat};type:material;color:%23ff6a00;size:medium;whitecircle:no;icontype:awesome`;
    });
    
    // Add API key
    url += `&apiKey=5a047258d51943729c19139c17b7ff1a`;
    
    // Add dimensions
    url += `&width=600&height=400`;
    
    // Set center and zoom if there are markers
    if (markers.length > 0) {
      // If multiple markers, set appropriate zoom level
      if (markers.length > 1) {
        url += `&zoom=${zoom || 5}`;
      } else {
        // For single marker, zoom in closer
        url += `&zoom=${zoom || 10}`;
      }
      
      // Center on the first marker
      url += `&center=lonlat:${center.lng},${center.lat}`;
    }
    
    return url;
  };

  return (
    <div className="w-full h-full relative bg-gray-100 rounded overflow-hidden">
      {markers.length > 0 ? (
        <img 
          src={generateMapUrl()} 
          alt="Map showing destinations" 
          className="w-full h-full object-cover"
          onError={(e) => {
            // Fallback if map image fails to load
            const target = e.currentTarget as HTMLImageElement;
            target.src = "https://via.placeholder.com/600x400?text=Map+View+Unavailable";
            console.error("Failed to load map image");
          }}
        />
      ) : (
        <div className="flex items-center justify-center h-full">
          <p className="text-gray-500 text-center">
            <span className="block text-3xl mb-2">🗺️</span>
            No destinations selected
          </p>
        </div>
      )}
      
      {/* Optional overlay with destination counts */}
      <div className="absolute bottom-2 right-2 bg-white bg-opacity-75 px-2 py-1 rounded-md text-sm">
        {markers.length} destination{markers.length !== 1 ? 's' : ''}
      </div>
    </div>
  );
};

type FormData = {
  title: string;
  startDate: string;
  endDate: string;
  budget?: string;
  interests?: string;
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
  const { showPandaModal, hidePandaModal } = usePandaAssistant();
  
  // Check for emergency auth in sessionStorage
  const [hasEmergencyAuth, setHasEmergencyAuth] = useState(false);
  
  useEffect(() => {
    // Check if we arrived via emergency navigation
    const authSuccess = sessionStorage.getItem('auth_success');
    const userEmail = sessionStorage.getItem('user_email');
    
    console.log("🔐 NewTrip: Checking emergency auth", { authSuccess, userEmail });
    
    if (authSuccess === 'true' && userEmail) {
      console.log("🔐 NewTrip: Emergency auth detected");
      setHasEmergencyAuth(true);
    }
  }, []);
  
  // Only show loading if we're not using emergency auth
  if (authLoading && !hasEmergencyAuth) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div>Loading...</div>
      </div>
    );
  }
  
  // Allow access if we have a user OR emergency auth
  if (!user && !hasEmergencyAuth) {
    console.log("🚫 NewTrip: No auth detected, redirecting to login");
    // Add a timestamp to avoid middleware cache issues
    const timestamp = Date.now();
    window.location.href = `/login?redirect=/trips/new&t=${timestamp}`;
    return null;
  }

  const [step, setStep] = useState(1);
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [primaryDestination, setPrimaryDestination] = useState<Destination | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pandaEmotion, setPandaEmotion] = useState<'happy' | 'thinking' | 'excited' | 'confused' | 'sad'>('excited');
  const [pandaMessage, setPandaMessage] = useState("Hi there! Let's plan your adventure. Where would you like to go?");
  const [hasInteracted, setHasInteracted] = useState(false);
  
  // Modal state for adding destinations
  const [showMultiDestModal, setShowMultiDestModal] = useState(false);
  
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>();
  
  // Handle primary destination selection (now expects an array of destinations)
  const handleDestinationSelect = (destinations: any[]) => {
    setHasInteracted(true);
    console.log("handleDestinationSelect called with:", destinations);
    if (!destinations || destinations.length === 0) return;
    setPandaEmotion('thinking');
    setPandaMessage(`Hmm, ${destinations[0].name}... Let me see what I can find!`);

    try {
      // Format all destinations to match the expected structure
      const places = destinations.map(destination => ({
        description: destination.formattedName,
        placeId: destination.place_id,
        mainText: destination.name,
        secondaryText: destination.country,
        location: {
          lat: destination.coordinates[1],
          lng: destination.coordinates[0]
        },
        details: {
          country: destination.country,
          formatted: destination.formattedName
        }
      }));

      // Set the first as primary destination
      setPrimaryDestination(places[0]);
      // Add all to destinations array
      setDestinations(places);
      // Show multi-destination modal
      setShowMultiDestModal(true);
      setPandaEmotion('excited');
    } catch (error) {
      console.error('Error processing destinations:', error);
      setPandaEmotion('confused');
      setPandaMessage("I'm having trouble finding information about this place. Could you try a different destination?");
      setError('Failed to load place details');
    }
  };

  // Add another destination (expects an array, but can use destinations[0] for single)
  const addDestination = (destinations: any[]) => {
    setHasInteracted(true);
    if (!destinations || destinations.length === 0) return;
    const destination = destinations[0]; // Only add the first if user picks one at a time
    console.log("Adding destination:", destination);

    // Format the destination to match the expected structure
    const place = {
      description: destination.formattedName,
      placeId: destination.place_id,
      mainText: destination.name,
      secondaryText: destination.country,
      location: {
        lat: destination.coordinates[1],
        lng: destination.coordinates[0]
      },
      details: {
        country: destination.country,
        formatted: destination.formattedName
      }
    };

    setDestinations(prev => [...prev, place]);
    setPandaEmotion('excited');
    const newPandaMessage = `Great! ${destination.name} added to your trip. You can add more destinations or continue to trip details.`;
    setPandaMessage(newPandaMessage);
    // setShowMultiDestModal(true); // Replace with showPandaModal

    const modalTitle = "Plan Your Adventure";
    const modalMessage = destinations.length > 0 ? // Check destinations.length + 1 effectively, as we just added one
      `Fantastic! You've selected ${[...destinations, place].map(d => d.mainText).join(' and ')}. Would you like to add more destinations to your adventure?` :
      `Great choice! ${place.mainText} sounds amazing! Do you want to add more destinations to your trip?`;

    showPandaModal({
      title: modalTitle,
      message: modalMessage,
      emotion: 'excited',
      primaryAction: {
        text: "Yes, add more destinations",
        onClick: () => {
          console.log("User chose to add more destinations");
          // setShowMultiDestModal(false); // Not needed
          setPandaMessage("Awesome! Search for another destination.");
          setPandaEmotion('happy');
          hidePandaModal();
        },
        style: 'primary'
      },
      secondaryAction: {
        text: "No, continue to trip details",
        onClick: () => {
          console.log("User chose to continue to trip details");
          // setShowMultiDestModal(false); // Not needed
          setPandaMessage("Perfect! Let's get into the details of your trip.");
          setPandaEmotion('excited');
          // Navigate to trip details page or next step
          // For now, just hiding modal and logging
          // router.push(`/trips/${tripId}/details`); // Example navigation
          setStep(2); // Correctly advance to the next step
          hidePandaModal();
        },
        style: 'secondary'
      },
      onClose: () => {
        console.log("Multi-destination modal closed by user");
        // setShowMultiDestModal(false); // Reset local state if it were still used
        // Decide if closing without choice should do something specific
        // For example, revert Panda message or emotion if needed.
      }
    });
  };

  // Remove a destination
  const removeDestination = (index: number) => {
    setHasInteracted(true);
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
    setHasInteracted(true);
    console.log("User chose to add more destinations");
    setShowMultiDestModal(false);
    setPandaMessage(`Great! You can add more destinations now. ${primaryDestination?.mainText} is your primary destination.`);
  };
  
  const handleFinishDestinations = () => {
    setHasInteracted(true);
    console.log("User chose to finish with one destination");
    setShowMultiDestModal(false);
    setStep(2);
    setPandaMessage(`Perfect! Let's set up your trip to ${primaryDestination?.mainText}.`);
  };
  
  // Handle form submission
  const onSubmit = async (data: FormData) => {
    setHasInteracted(true);
    if (!user || !primaryDestination || destinations.length === 0) return;
    
    setIsLoading(true);
    setError(null);
    setPandaEmotion('thinking');
    setPandaMessage('Creating your trip and preparing your adventure...');
    
    try {
      // Generate a consistent ID format that will be used for both Supabase and OpenRouter
      const tripId = `trip-${Date.now()}`;
      
      // Get user ID from auth context or sessionStorage
      let userId = user?.id;
      
      // If we don't have a user ID from auth context, check sessionStorage
      if (!userId) {
        const storedUserId = sessionStorage.getItem('user_id');
        if (storedUserId) {
          console.log('Using user ID from sessionStorage:', storedUserId);
          userId = storedUserId;
        } else {
          console.log('No user ID available, using emergency fallback ID');
          // Generate a fallback ID for emergency situations
          userId = `temp-${Date.now()}`;
        }
      }
      
      // Prepare trip data
      const tripData = {
        id: tripId, // Use the pre-generated ID
        user_id: userId,
        title: data.title,
        start_date: data.startDate,
        end_date: data.endDate,
        budget: data.budget ? parseFloat(data.budget) : null,
        interests: data.interests,
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
      };
      
      console.log('Creating trip with ID:', tripId);
      
      // Create the trip in the database with our pre-generated ID
      // Add emergency authentication headers if we're using emergency auth
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      // Add emergency auth headers if we have them in sessionStorage
      const authSuccess = sessionStorage.getItem('auth_success');
      const userEmail = sessionStorage.getItem('user_email');
      
      if (authSuccess === 'true') {
        console.log('Adding emergency auth headers to API request');
        headers['x-emergency-auth'] = 'true';
        
        if (userEmail) {
          headers['x-user-email'] = userEmail;
        }
      }
      
      const response = await fetch('/api/trips/create', {
        method: 'POST',
        headers,
        credentials: 'include', // Include cookies for authentication
        body: JSON.stringify(tripData),
      });
      
      if (!response.ok) {
        throw new Error('Failed to create trip');
      }
      
      const result = await response.json();
      // Use our pre-generated ID instead of relying on the response
      
      setPandaEmotion('excited');
      setPandaMessage("Trip saved! Now let's plan your itinerary!");
      
      // Navigate to the itinerary generation page with the new trip ID
  // Pass the trip data directly to avoid needing to fetch from Supabase
  try {
    console.log("Navigating to the itinerary generation page with ID:", tripId);
    
    // Use the complete trip data we already have
    const clientTripData = {
      ...tripData,
      // Ensure these fields match what the itinerary page expects
      id: tripId,
      trip_id: tripId
    };
    
    console.log("Passing client-side trip data:", clientTripData);
    
    if (typeof window !== 'undefined') {
      try {
        // Store the full trip data in sessionStorage with the trip ID as key
        sessionStorage.setItem(`trip-${tripId}`, JSON.stringify(tripData));
        
        // EMERGENCY AUTH: Ensure auth info is in sessionStorage
        if (user?.email) {
          sessionStorage.setItem('auth_success', 'true');
          sessionStorage.setItem('user_email', user.email);
          console.log('Emergency auth info stored in sessionStorage');
        }
        
        console.log('Trip data stored in sessionStorage');
      } catch (err) {
        console.error('Error storing trip data in sessionStorage:', err);
        // Continue with navigation even if storage fails
      }
    }
    
    // Add a timestamp to bypass middleware auth checks
    const timestamp = Date.now();
    
    // Navigate to the itinerary page with the trip data and timestamp
    console.log('Using emergency navigation to itinerary page with timestamp');
    
    // IMPORTANT: Use window.location.href instead of router.push to force a full page reload
    // This ensures we don't get caught in client-side navigation issues
    window.location.href = `/trips/${tripId}/itinerary?new=true&t=${timestamp}`;
  } catch (err: any) {
    console.error("Error navigating:", err);
    setError("Failed to navigate to trip. Please try again.");
    setPandaEmotion("confused");
    setPandaMessage("Oh no! I had trouble saving your trip. Let's try again.");
    setIsLoading(false);
  }
    } catch (err: any) {
      console.error('Error creating trip:', err);
      setError('Failed to create trip. Please try again.');
      setPandaEmotion('confused');
      setPandaMessage('Oh no! I had trouble saving your trip. Let\'s try again.');
      setIsLoading(false);
    }
  };
  
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8 text-center">Plan Your New Adventure</h1>
      
      {/* Debug controls removed */}
      
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
            <h2 className="text-xl font-bold">Choose Your Destination</h2>
            
            {/* Primary destination search */}
            <div className="space-y-4">
              {destinations.length === 0 ? (
                <div>
                  <DestinationSearchWrapper 
                    onDestinationSelect={handleDestinationSelect}
                    placeholder="Search for a destination (country, city, etc)..."
                    label=""
                    onStatusChange={({ emotion, message }) => {
                      setPandaEmotion(emotion);
                      setPandaMessage(message);
                      setHasInteracted(true);
                    }}
                  />
                </div>
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
                      <DestinationSearchWrapper 
                        onDestinationSelect={addDestination}
                        placeholder="Search for another destination..."
                        label=""
                        onStatusChange={({ emotion, message }) => {
                          setPandaEmotion(emotion);
                          setPandaMessage(message);
                          setHasInteracted(true);
                        }}
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
              <label htmlFor="interests" className="block text-sm font-medium text-gray-700 mb-1">
                Interests (Optional)
              </label>
              <textarea
                id="interests"
                placeholder="Enter your interests here. Ex. Adventure, Shopping, Local Food, etc"
                rows={3}
                {...register('interests')}
                className="w-full p-2 border border-gray-300 rounded-md"
              ></textarea>
              <p className="mt-1 text-xs text-gray-500 italic">Your interests will help us create a better itinerary for you</p>
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
        showMessage={hasInteracted}
      />
    </div>
  );
}
