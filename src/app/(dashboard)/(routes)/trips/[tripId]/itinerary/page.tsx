'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { PandaAssistant } from '@/components/ui/PandaAssistant';
import { PandaModal } from '@/components/ui/PandaModal';
import axios from 'axios';
import { 
  GeminiResponse, 
  ItineraryOption, 
  ActivityOption,
  TripDetails
} from '@/services/gemini-service';
import Image from 'next/image';

// Activity type icons
const activityTypeIcons: Record<string, string> = {
  sightseeing: '🏛️',
  adventure: '🧗‍♀️',
  relaxation: '🧘‍♀️',
  cultural: '🎭',
  culinary: '🍽️',
  other: '📌',
};

// Mock getTrip function - replace with your actual API call
const getTrip = async (tripId: string): Promise<any> => {
  // Simulate API call
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Return mock data
  return {
    id: tripId,
    title: 'My Amazing Trip',
    start_date: '2025-06-10',
    end_date: '2025-06-18',
    budget: '2000',
    notes: 'Looking for a mix of adventure and relaxation',
    destination: 'Hong Kong, China',
    destination_coords: { lat: 22.3193, lng: 114.1694 },
    place_id: 'ChIJD3uTd9sABDQRIaLbfVE2Qh0',
    additional_destinations: [],
    user_id: 'user123'
  };
};

export default function ItineraryPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const tripId = params.tripId as string;
  const isNewTrip = searchParams.get('new') === 'true';

  // States
  const [trip, setTrip] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pandaMessage, setPandaMessage] = useState('I\'m generating exciting itinerary options for you!');
  const [pandaEmotion, setPandaEmotion] = useState<'happy' | 'thinking' | 'excited' | 'confused' | 'sad'>('thinking');
  const [itineraryOptions, setItineraryOptions] = useState<ItineraryOption[]>([]);
  const [selectedOption, setSelectedOption] = useState<ItineraryOption | null>(null);
  const [selectedActivities, setSelectedActivities] = useState<Record<string, boolean>>({});
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [finalItineraryId, setFinalItineraryId] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<'options' | 'customize' | 'finalizing' | 'final'>('options');

  // Load trip data
  useEffect(() => {
    const loadTrip = async () => {
      try {
        const tripData = await getTrip(tripId);
        setTrip(tripData);
        
        // If this is a new trip, request itinerary options
        if (isNewTrip) {
          setTimeout(() => {
            fetchItineraryOptions(tripData);
          }, 1000);
        } else {
          // For existing trips, load saved itinerary if available
          setLoading(false);
        }
      } catch (err) {
        console.error('Error loading trip:', err);
        setError('Failed to load trip details');
        setPandaEmotion('confused');
        setPandaMessage('I had trouble loading your trip details. Please try again.');
        setLoading(false);
      }
    };
    
    loadTrip();
  }, [tripId, isNewTrip]);

  // Fetch itinerary options from the Gemini API
  const fetchItineraryOptions = async (tripData: any) => {
    try {
      setPandaEmotion('thinking');
      setPandaMessage('Generating exciting itinerary options based on your trip details...');
      
      // Prepare trip details for the Gemini API
      const tripDetails: TripDetails = {
        title: tripData.title,
        startDate: tripData.start_date,
        endDate: tripData.end_date,
        duration: Math.ceil((new Date(tripData.end_date).getTime() - new Date(tripData.start_date).getTime()) / (1000 * 3600 * 24)) + 1,
        budget: tripData.budget,
        notes: tripData.notes,
        mainDestination: tripData.destination,
        allDestinations: [tripData.destination, ...(tripData.additional_destinations || []).map((d: any) => d.description)]
      };
      
      // Call the API endpoint that will use the Gemini service
      const response = await axios.post('/api/gemini/generate-options', { tripDetails });
      const data: GeminiResponse = response.data;
      
      if (data.success && data.itineraryOptions) {
        setItineraryOptions(data.itineraryOptions);
        setPandaEmotion('excited');
        setPandaMessage('I\'ve created some exciting itinerary options for you! Take a look and pick your favorite!');
      } else {
        throw new Error(data.error || 'Failed to generate itinerary options');
      }
    } catch (err: any) {
      console.error('Error generating itinerary options:', err);
      setError('Failed to generate itinerary options. Please try again.');
      setPandaEmotion('sad');
      setPandaMessage('I had trouble creating itinerary options. Let\'s try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle option selection
  const handleSelectOption = (option: ItineraryOption) => {
    setSelectedOption(option);
    setPandaEmotion('excited');
    setPandaMessage(`Great choice! Now you can customize the activities in the "${option.title}" itinerary.`);
    setCurrentView('customize');
    
    // Initialize all activities as selected
    const initialSelectedActivities: Record<string, boolean> = {};
    option.days.forEach(day => {
      day.activities.forEach(activity => {
        initialSelectedActivities[activity.id] = true;
      });
    });
    setSelectedActivities(initialSelectedActivities);
  };

  // Toggle activity selection
  const toggleActivitySelection = (activityId: string) => {
    setSelectedActivities(prev => ({
      ...prev,
      [activityId]: !prev[activityId]
    }));
  };

  // Generate final itinerary
  const generateFinalItinerary = async () => {
    if (!selectedOption || !trip) return;
    
    setCurrentView('finalizing');
    setPandaEmotion('thinking');
    setPandaMessage('Creating your personalized itinerary based on your selections...');
    
    try {
      // Collect all selected activities
      const selectedActivitiesList: ActivityOption[] = [];
      selectedOption.days.forEach(day => {
        day.activities.forEach(activity => {
          if (selectedActivities[activity.id]) {
            selectedActivitiesList.push({
              ...activity,
              dayNumber: day.dayNumber
            });
          }
        });
      });
      
      // Prepare trip details
      const tripDetails: TripDetails = {
        title: trip.title,
        startDate: trip.start_date,
        endDate: trip.end_date,
        duration: Math.ceil((new Date(trip.end_date).getTime() - new Date(trip.start_date).getTime()) / (1000 * 3600 * 24)) + 1,
        budget: trip.budget,
        notes: trip.notes,
        mainDestination: trip.destination,
        allDestinations: [trip.destination, ...(trip.additional_destinations || []).map((d: any) => d.description)]
      };
      
      // Call the API endpoint to generate the final itinerary
      const response = await axios.post('/api/gemini/generate-final-itinerary', {
        tripDetails,
        selectedActivities: selectedActivitiesList
      });
      
      const data: GeminiResponse = response.data;
      
      if (data.success && data.finalItinerary) {
        // Save final itinerary ID and navigate to it
        setFinalItineraryId(data.finalItinerary.id);
        setPandaEmotion('excited');
        setPandaMessage('Your personalized itinerary is ready! I hope you enjoy your trip!');
        setCurrentView('final');
        
        // Save the itinerary to the database
        await axios.post(`/api/trips/${tripId}/itinerary`, {
          itinerary: data.finalItinerary
        });
        
        // Redirect to the final itinerary view
        setTimeout(() => {
          router.push(`/trips/${tripId}/view`);
        }, 2000);
      } else {
        throw new Error(data.error || 'Failed to generate final itinerary');
      }
    } catch (err: any) {
      console.error('Error generating final itinerary:', err);
      setError('Failed to generate final itinerary. Please try again.');
      setPandaEmotion('sad');
      setPandaMessage('I had trouble creating your final itinerary. Let\'s try again.');
      setCurrentView('customize');
    }
  };

  // Handle back button
  const handleBack = () => {
    if (currentView === 'customize') {
      setCurrentView('options');
      setSelectedOption(null);
      setPandaEmotion('happy');
      setPandaMessage('Let\'s pick a different itinerary option!');
    }
  };

  // Render loading state
  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <div className="mb-6">
            <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
          <h2 className="text-xl font-medium text-gray-700 mb-2">Creating Your Adventure</h2>
          <p className="text-gray-500 text-center max-w-md">
            Po is working on crafting the perfect itinerary options for your trip to {trip?.destination}...
          </p>
        </div>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <div className="text-red-500 text-5xl mb-4">😕</div>
          <h2 className="text-xl font-medium text-red-700 mb-2">Oops! Something went wrong</h2>
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => router.push('/trips')}
            className="px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 transition-colors"
          >
            Back to My Trips
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">
          {currentView === 'options' ? 'Choose Your Adventure' : 
           currentView === 'customize' ? 'Customize Your Itinerary' :
           currentView === 'finalizing' ? 'Creating Your Itinerary' :
           'Your Itinerary is Ready!'}
        </h1>
        <p className="text-gray-600">
          {trip?.title} • {new Date(trip?.start_date).toLocaleDateString()} to {new Date(trip?.end_date).toLocaleDateString()}
        </p>
      </div>

      {/* Content based on current view */}
      {currentView === 'options' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {itineraryOptions.map((option) => (
            <div 
              key={option.id}
              className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow cursor-pointer border border-gray-200"
              onClick={() => handleSelectOption(option)}
            >
              <div className="h-48 bg-gradient-to-r from-orange-400 to-orange-600 flex items-center justify-center text-white p-6">
                <h2 className="text-2xl font-bold text-center">{option.title}</h2>
              </div>
              <div className="p-6">
                <p className="text-gray-600 mb-4">{option.description}</p>
                <h3 className="font-medium text-gray-800 mb-2">Highlights:</h3>
                <ul className="space-y-1 mb-4">
                  {option.highlights.map((highlight, i) => (
                    <li key={i} className="flex items-start">
                      <span className="text-orange-500 mr-2">✓</span>
                      <span className="text-gray-700">{highlight}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <p className="text-sm text-gray-500">{option.days.length} days of activities</p>
                  <button
                    className="mt-2 w-full px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 transition-colors"
                  >
                    Select This Itinerary
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {currentView === 'customize' && selectedOption && (
        <div>
          <div className="mb-6 flex items-center">
            <button
              onClick={handleBack}
              className="mr-4 px-3 py-1 text-orange-500 border border-orange-500 rounded-md hover:bg-orange-50 transition-colors"
            >
              ← Back
            </button>
            <h2 className="text-2xl font-bold text-gray-800">{selectedOption.title}</h2>
          </div>

          <p className="text-gray-600 mb-6">{selectedOption.description}</p>

          <div className="bg-orange-50 rounded-lg p-6 mb-8">
            <h3 className="font-medium text-gray-800 mb-3">Instructions:</h3>
            <p className="text-gray-700">
              Customize your itinerary by selecting or deselecting activities. Po will create a personalized day-by-day
              itinerary based on your selections.
            </p>
          </div>

          <div className="space-y-8">
            {selectedOption.days.map((day) => (
              <div key={day.dayNumber} className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-xl font-bold text-gray-800 mb-2">{day.title}</h3>
                <p className="text-gray-600 mb-4">{day.description}</p>

                <div className="space-y-4">
                  {day.activities.map((activity) => (
                    <div 
                      key={activity.id} 
                      className={`border rounded-lg p-4 ${
                        selectedActivities[activity.id] 
                          ? 'border-orange-300 bg-orange-50' 
                          : 'border-gray-200'
                      }`}
                    >
                      <div className="flex items-start">
                        <div className="flex-shrink-0 w-6 h-6 mr-3 mt-1">
                          <input
                            type="checkbox"
                            id={activity.id}
                            checked={selectedActivities[activity.id] || false}
                            onChange={() => toggleActivitySelection(activity.id)}
                            className="w-6 h-6 accent-orange-500 rounded"
                          />
                        </div>
                        <div className="flex-grow">
                          <div className="flex items-center">
                            <span className="text-lg mr-2">
                              {activityTypeIcons[activity.type] || '📌'}
                            </span>
                            <label htmlFor={activity.id} className="text-lg font-medium text-gray-800 cursor-pointer">
                              {activity.title}
                            </label>
                          </div>
                          <p className="text-gray-600 mt-1">{activity.description}</p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {activity.location && (
                              <span className="text-sm bg-gray-100 rounded-full px-3 py-1">
                                📍 {activity.location}
                              </span>
                            )}
                            {activity.duration && (
                              <span className="text-sm bg-gray-100 rounded-full px-3 py-1">
                                ⏱️ {activity.duration}
                              </span>
                            )}
                            {activity.cost && (
                              <span className="text-sm bg-gray-100 rounded-full px-3 py-1">
                                💰 {activity.cost}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {day.meals && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <h4 className="font-medium text-gray-700 mb-2">Meal Recommendations:</h4>
                    <p className="text-gray-600">{day.meals.join(' • ')}</p>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="mt-8 flex justify-center">
            <button
              onClick={() => setShowConfirmModal(true)}
              className="px-6 py-3 bg-orange-500 text-white rounded-md hover:bg-orange-600 transition-colors text-lg font-medium"
            >
              Generate My Personalized Itinerary
            </button>
          </div>
        </div>
      )}

      {currentView === 'finalizing' && (
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <div className="mb-6">
            <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
          <h2 className="text-xl font-medium text-gray-700 mb-2">Creating Your Perfect Itinerary</h2>
          <p className="text-gray-500 text-center max-w-md">
            Po is crafting your personalized day-by-day itinerary with all the details you'll need for your adventure...
          </p>
        </div>
      )}

      {/* Panda Assistant */}
      <PandaAssistant
        emotion={pandaEmotion}
        message={pandaMessage}
        position="bottom-right"
        size="lg"
      />

      {/* Confirmation Modal */}
      <PandaModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        title="Ready to Create Your Itinerary?"
        message="I'll create a personalized day-by-day itinerary based on your activity selections. This will include maps, daily schedules, and all the details you need for your trip!"
        emotion="excited"
        primaryAction={{
          text: "Yes, create my itinerary!",
          onClick: () => {
            setShowConfirmModal(false);
            generateFinalItinerary();
          }
        }}
        secondaryAction={{
          text: "I need to review my selections",
          onClick: () => {
            setShowConfirmModal(false);
          }
        }}
      >
        <div className="bg-white bg-opacity-70 rounded-lg p-3 shadow-inner">
          <p className="text-sm text-gray-700 mb-2">
            Your final itinerary will include:
          </p>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <span className="text-orange-500">✓</span>
              <span>Day-by-day schedule with times</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <span className="text-orange-500">✓</span>
              <span>Interactive maps for each location</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <span className="text-orange-500">✓</span>
              <span>Restaurant recommendations</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <span className="text-orange-500">✓</span>
              <span>Travel tips and local insights</span>
            </div>
          </div>
        </div>
      </PandaModal>
    </div>
  );
}
