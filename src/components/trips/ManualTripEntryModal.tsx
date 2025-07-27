'use client';

import React, { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Badge } from '@/components/ui/Badge';
import { MotionDiv } from '@/components/ui/Motion';
import { 
  MapPin, 
  Calendar, 
  Plane, 
  Hotel, 
  Plus,
  X,
  Train,
  Car,
  Bus,
  Clock,
  Phone,
  Mail,
  Building,
  Users,
  AlertTriangle
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

// Initialize Supabase client for this component
const supabase = createClientComponentClient();

interface Destination {
  id: string;
  name: string;
  address?: string;
}

interface DaySchedule {
  id: string;
  day: number;
  date: string;
  activities: string;
  notes?: string;
}

interface TravelDetails {
  id: string;
  mode: 'flight' | 'train' | 'car' | 'bus';
  details: string;
  departureTime?: string;
  arrivalTime?: string;
  bookingReference?: string;
  contactInfo?: string;
}

interface AccommodationDetails {
  id: string;
  name: string;
  address: string;
  checkIn: string;
  checkOut: string;
  confirmationNumber?: string;
  contactInfo?: string;
  notes?: string;
}

interface ManualTripEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ManualTripEntryModal: React.FC<ManualTripEntryModalProps> = ({ 
  isOpen, 
  onClose 
}) => {
  const { user } = useAuth();
  const router = useRouter();
  
  // Form state
  const [tripName, setTripName] = useState('');
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [daySchedules, setDaySchedules] = useState<DaySchedule[]>([]);
  const [travelDetails, setTravelDetails] = useState<TravelDetails[]>([]);
  const [accommodations, setAccommodations] = useState<AccommodationDetails[]>([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step navigation
  const totalSteps = 5;
  const stepTitles = [
    'Trip Details',
    'Destinations', 
    'Daily Schedule',
    'Travel Details',
    'Accommodation'
  ];

  // Add destination
  const addDestination = useCallback(() => {
    const newDestination: Destination = {
      id: Date.now().toString(),
      name: '',
      address: ''
    };
    setDestinations(prev => [...prev, newDestination]);
  }, []);

  // Remove destination
  const removeDestination = useCallback((id: string) => {
    setDestinations(prev => prev.filter(dest => dest.id !== id));
  }, []);

  // Update destination
  const updateDestination = useCallback((id: string, field: keyof Destination, value: string) => {
    setDestinations(prev => prev.map(dest => 
      dest.id === id ? { ...dest, [field]: value } : dest
    ));
  }, []);

  // Add day schedule
  const addDaySchedule = useCallback(() => {
    const newDay: DaySchedule = {
      id: Date.now().toString(),
      day: daySchedules.length + 1,
      date: '',
      activities: '',
      notes: ''
    };
    setDaySchedules(prev => [...prev, newDay]);
  }, [daySchedules.length]);

  // Remove day schedule
  const removeDaySchedule = useCallback((id: string) => {
    setDaySchedules(prev => prev.filter(day => day.id !== id));
  }, []);

  // Update day schedule
  const updateDaySchedule = useCallback((id: string, field: keyof DaySchedule, value: string | number) => {
    setDaySchedules(prev => prev.map(day => 
      day.id === id ? { ...day, [field]: value } : day
    ));
  }, []);

  // Add travel details
  const addTravelDetails = useCallback(() => {
    const newTravel: TravelDetails = {
      id: Date.now().toString(),
      mode: 'flight',
      details: '',
      departureTime: '',
      arrivalTime: '',
      bookingReference: '',
      contactInfo: ''
    };
    setTravelDetails(prev => [...prev, newTravel]);
  }, []);

  // Remove travel details
  const removeTravelDetails = useCallback((id: string) => {
    setTravelDetails(prev => prev.filter(travel => travel.id !== id));
  }, []);

  // Update travel details
  const updateTravelDetails = useCallback((id: string, field: keyof TravelDetails, value: string) => {
    setTravelDetails(prev => prev.map(travel => 
      travel.id === id ? { ...travel, [field]: value } : travel
    ));
  }, []);

  // Add accommodation
  const addAccommodation = useCallback(() => {
    const newAccommodation: AccommodationDetails = {
      id: Date.now().toString(),
      name: '',
      address: '',
      checkIn: '',
      checkOut: '',
      confirmationNumber: '',
      contactInfo: '',
      notes: ''
    };
    setAccommodations(prev => [...prev, newAccommodation]);
  }, []);

  // Remove accommodation
  const removeAccommodation = useCallback((id: string) => {
    setAccommodations(prev => prev.filter(acc => acc.id !== id));
  }, []);

  // Update accommodation
  const updateAccommodation = useCallback((id: string, field: keyof AccommodationDetails, value: string) => {
    setAccommodations(prev => prev.map(acc => 
      acc.id === id ? { ...acc, [field]: value } : acc
    ));
  }, []);

  // ✅ FIXED: Simplified submit function using AuthContext user only
  const handleSubmit = async () => {
    console.log('🔥 SUBMIT BUTTON CLICKED!');
    
    if (!user) {
      console.error('❌ No user found');
      setError('You must be logged in to create a trip');
      return;
    }

    console.log('✅ User check passed:', user.email);
    
    setIsSubmitting(true);
    setError(null);

    try {
      console.log('🚀 Starting trip submission...');

      // Validate basic form data
      if (!tripName || !startDate || !endDate) {
        throw new Error('Please fill in all required fields (Trip Name, Start Date, End Date)');
      }

      if (destinations.length === 0) {
        throw new Error('Please add at least one destination');
      }

      if (daySchedules.length === 0) {
        throw new Error('Please add at least one day schedule');
      }

      // Prepare trip data
      const tripData = {
        title: tripName,
        destination: destinations.map(d => d.name).join(', '),
        start_date: startDate,
        end_date: endDate,
        manual_entry_data: {
          destinations: destinations,
          daySchedules: daySchedules,
          travelDetails: travelDetails,
          accommodations: accommodations
        }
      };

      console.log('📤 Prepared trip data:', JSON.stringify(tripData, null, 2));

      // ✅ FIXED: Use AuthContext user directly, no session fetching
      console.log('📡 Making API call to /api/trips/create...');
      
      const response = await fetch('/api/trips/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // ✅ FIXED: Let cookies handle authentication, no manual auth header
        },
        credentials: 'include', // ✅ This ensures cookies are sent
        body: JSON.stringify(tripData),
      });

      console.log('📡 Response received:', response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ API Error Response:', errorText);
        
        let errorMessage;
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error || `Server error: ${response.status}`;
        } catch {
          errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        }
        
        throw new Error(errorMessage);
      }

      const result = await response.json();
      console.log('✅ Success response:', result);
      
      if (result.success && (result.tripId || result.trip?.id)) {
        const tripId = result.tripId || result.trip.id;
        console.log('🧭 Navigating to trip:', `/trips/${tripId}/diary`);
        
        // Close modal first
        onClose();
        
        // Then navigate
        router.push(`/trips/${tripId}/diary`);
      } else {
        throw new Error('Invalid response from server - missing trip ID');
      }
      
    } catch (error) {
      // ✅ FIXED: Proper error handling without unknown type issues
      console.error('💥 Complete error details:', error);
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          setError('Request timed out - please try again');
        } else {
          setError(error.message);
        }
      } else {
        setError('Failed to create trip - please try again');
      }
    } finally {
      console.log('🏁 Finally block - resetting isSubmitting');
      setIsSubmitting(false);
    }
  };

  // Validation for each step
  const isStepValid = (step: number): boolean => {
    switch (step) {
      case 1:
        return tripName.trim() !== '' && startDate !== '' && endDate !== '';
      case 2:
        return destinations.length > 0 && destinations.every(d => d.name.trim() !== '');
      case 3:
        return daySchedules.length > 0 && daySchedules.every(d => d.activities.trim() !== '');
      case 4:
        return true; // Travel details are optional
      case 5:
        return true; // Accommodation is optional
      default:
        return false;
    }
  };

  const nextStep = () => {
    if (currentStep < totalSteps && isStepValid(currentStep)) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const getTravelModeIcon = (mode: string) => {
    switch (mode) {
      case 'flight': return <Plane className="w-4 h-4" />;
      case 'train': return <Train className="w-4 h-4" />;
      case 'car': return <Car className="w-4 h-4" />;
      case 'bus': return <Bus className="w-4 h-4" />;
      default: return <Plane className="w-4 h-4" />;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start md:items-center justify-center z-60 p-4 overflow-y-auto">
      <MotionDiv
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-lg shadow-xl max-w-4xl w-full my-4 relative z-[61]"
  >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold">Create Manual Trip Entry</h2>
              <p className="text-blue-100 mt-1">Step {currentStep} of {totalSteps}: {stepTitles[currentStep - 1]}</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-white hover:bg-white/20"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4 m-6 mb-0">
            <div className="flex">
              <AlertTriangle className="w-5 h-5 text-red-400 mr-3 mt-0.5" />
              <p className="text-red-700">{error}</p>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 200px)' }}>
          {/* Step 1: Trip Details */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Trip Name *
                </label>
                <Input
                  value={tripName}
                  onChange={(e) => setTripName(e.target.value)}
                  placeholder="e.g., Summer Vacation to Europe"
                  className="w-full"
                />
              </div>
              
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Start Date *
                  </label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    End Date *
                  </label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Destinations */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900">Destinations</h3>
                <Button onClick={addDestination} className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Destination
                </Button>
              </div>
              
              {destinations.map((destination) => (
                <Card key={destination.id} className="border-2 border-gray-200">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-4">
                      <MapPin className="w-5 h-5 text-blue-600 mt-1" />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeDestination(destination.id)}
                        className="text-red-600 hover:bg-red-50"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Destination Name *
                        </label>
                        <Input
                          value={destination.name}
                          onChange={(e) => updateDestination(destination.id, 'name', e.target.value)}
                          placeholder="e.g., Paris, France"
                          className="w-full"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Address (Optional)
                        </label>
                        <Input
                          value={destination.address || ''}
                          onChange={(e) => updateDestination(destination.id, 'address', e.target.value)}
                          placeholder="Specific address or area"
                          className="w-full"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              {destinations.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <MapPin className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No destinations added yet. Add at least one destination to continue.</p>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Daily Schedule */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900">Daily Schedule</h3>
                <Button onClick={addDaySchedule} className="bg-green-600 hover:bg-green-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Day
                </Button>
              </div>
              
              {daySchedules.map((day) => (
                <Card key={day.id} className="border-2 border-gray-200">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-center">
                      <CardTitle className="text-lg flex items-center">
                        <Calendar className="w-5 h-5 text-green-600 mr-2" />
                        Day {day.day}
                      </CardTitle>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeDaySchedule(day.id)}
                        className="text-red-600 hover:bg-red-50"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Date
                      </label>
                      <Input
                        type="date"
                        value={day.date}
                        onChange={(e) => updateDaySchedule(day.id, 'date', e.target.value)}
                        className="w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Activities *
                      </label>
                      <Textarea
                        value={day.activities}
                        onChange={(e) => updateDaySchedule(day.id, 'activities', e.target.value)}
                        placeholder="Describe your planned activities for this day..."
                        className="w-full"
                        rows={3}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Notes (Optional)
                      </label>
                      <Textarea
                        value={day.notes || ''}
                        onChange={(e) => updateDaySchedule(day.id, 'notes', e.target.value)}
                        placeholder="Any additional notes or reminders..."
                        className="w-full"
                        rows={2}
                      />
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              {daySchedules.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No daily schedules added yet. Add at least one day to continue.</p>
                </div>
              )}
            </div>
          )}

          {/* Step 4: Travel Details */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Travel Details</h3>
                  <p className="text-sm text-gray-600">Optional: Add your flight, train, or other travel information</p>
                </div>
                <Button onClick={addTravelDetails} className="bg-purple-600 hover:bg-purple-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Travel
                </Button>
              </div>
              
              {travelDetails.map((travel) => (
                <Card key={travel.id} className="border-2 border-gray-200">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center">
                        {getTravelModeIcon(travel.mode)}
                        <Badge variant="outline" className="ml-2 capitalize">
                          {travel.mode}
                        </Badge>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeTravelDetails(travel.id)}
                        className="text-red-600 hover:bg-red-50"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Travel Mode
                        </label>
                        <select
                          value={travel.mode}
                          onChange={(e) => updateTravelDetails(travel.id, 'mode', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="flight">Flight</option>
                          <option value="train">Train</option>
                          <option value="car">Car</option>
                          <option value="bus">Bus</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Travel Details
                        </label>
                        <Textarea
                          value={travel.details}
                          onChange={(e) => updateTravelDetails(travel.id, 'details', e.target.value)}
                          placeholder="Flight number, route, etc."
                          className="w-full"
                          rows={2}
                        />
                      </div>
                      
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Departure Time
                          </label>
                          <Input
                            type="datetime-local"
                            value={travel.departureTime || ''}
                            onChange={(e) => updateTravelDetails(travel.id, 'departureTime', e.target.value)}
                            className="w-full"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Arrival Time
                          </label>
                          <Input
                            type="datetime-local"
                            value={travel.arrivalTime || ''}
                            onChange={(e) => updateTravelDetails(travel.id, 'arrivalTime', e.target.value)}
                            className="w-full"
                          />
                        </div>
                      </div>
                      
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Booking Reference
                          </label>
                          <Input
                            value={travel.bookingReference || ''}
                            onChange={(e) => updateTravelDetails(travel.id, 'bookingReference', e.target.value)}
                            placeholder="Confirmation number"
                            className="w-full"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Contact Info
                          </label>
                          <Input
                            value={travel.contactInfo || ''}
                            onChange={(e) => updateTravelDetails(travel.id, 'contactInfo', e.target.value)}
                            placeholder="Airline/company contact"
                            className="w-full"
                          />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              {travelDetails.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Plane className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No travel details added yet. This section is optional.</p>
                </div>
              )}
            </div>
          )}

          {/* Step 5: Accommodation */}
          {currentStep === 5 && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Accommodation</h3>
                  <p className="text-sm text-gray-600">Optional: Add your hotel or accommodation details</p>
                </div>
                <Button onClick={addAccommodation} className="bg-orange-600 hover:bg-orange-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Accommodation
                </Button>
              </div>
              
              {accommodations.map((accommodation) => (
                <Card key={accommodation.id} className="border-2 border-gray-200">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-4">
                      <Hotel className="w-5 h-5 text-orange-600" />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeAccommodation(accommodation.id)}
                        className="text-red-600 hover:bg-red-50"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Hotel/Accommodation Name
                        </label>
                        <Input
                          value={accommodation.name}
                          onChange={(e) => updateAccommodation(accommodation.id, 'name', e.target.value)}
                          placeholder="e.g., Grand Hotel Paris"
                          className="w-full"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Address
                        </label>
                        <Input
                          value={accommodation.address}
                          onChange={(e) => updateAccommodation(accommodation.id, 'address', e.target.value)}
                          placeholder="Hotel address"
                          className="w-full"
                        />
                      </div>
                      
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Check-in Date
                          </label>
                          <Input
                            type="date"
                            value={accommodation.checkIn}
                            onChange={(e) => updateAccommodation(accommodation.id, 'checkIn', e.target.value)}
                            className="w-full"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Check-out Date
                          </label>
                          <Input
                            type="date"
                            value={accommodation.checkOut}
                            onChange={(e) => updateAccommodation(accommodation.id, 'checkOut', e.target.value)}
                            className="w-full"
                          />
                        </div>
                      </div>
                      
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Confirmation Number
                          </label>
                          <Input
                            value={accommodation.confirmationNumber || ''}
                            onChange={(e) => updateAccommodation(accommodation.id, 'confirmationNumber', e.target.value)}
                            placeholder="Booking confirmation"
                            className="w-full"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Contact Info
                          </label>
                          <Input
                            value={accommodation.contactInfo || ''}
                            onChange={(e) => updateAccommodation(accommodation.id, 'contactInfo', e.target.value)}
                            placeholder="Phone or email"
                            className="w-full"
                          />
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Notes
                        </label>
                        <Textarea
                          value={accommodation.notes || ''}
                          onChange={(e) => updateAccommodation(accommodation.id, 'notes', e.target.value)}
                          placeholder="Special requests, room preferences, etc."
                          className="w-full"
                          rows={2}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              {accommodations.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Hotel className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No accommodation details added yet. This section is optional.</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 flex justify-between items-center">
          <Button
            variant="outline"
            onClick={prevStep}
            disabled={currentStep === 1}
            type="button"
          >
            Previous
          </Button>
          
          <div className="flex space-x-2">
            {Array.from({ length: totalSteps }, (_, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full ${
                  i + 1 <= currentStep ? 'bg-blue-600' : 'bg-gray-300'
                }`}
              />
            ))}
          </div>
          
          {currentStep < totalSteps ? (
            <Button
              onClick={nextStep}
              disabled={!isStepValid(currentStep)}
              type="button"
            >
              Next
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || !isStepValid(currentStep)}
              type="button"
              className="bg-green-600 hover:bg-green-700"
            >
              {isSubmitting ? 'Creating Trip...' : 'Create Trip'}
            </Button>
          )}
        </div>
      </MotionDiv>
    </div>
  );
};

export default ManualTripEntryModal;