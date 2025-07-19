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
import supabase from '@/lib/supabase';

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

  // Submit trip
  const handleSubmit = async () => {
    if (!user) {
      setError('You must be logged in to create a trip');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Create the trip
      const { data: trip, error: tripError } = await supabase
        .from('trips')
        .insert({
          user_id: user.id,
          title: tripName, // Fixed: Schema uses 'title', not 'name'
          destination: destinations.map(d => d.name).join(', '),
          start_date: startDate,
          end_date: endDate,
          description: `Manual entry trip with ${destinations.length} destinations`,
          status: 'planned'
        })
        .select()
        .single();

      if (tripError) throw tripError;

      // Store additional trip data in a JSON format for now
      // In a real implementation, you'd want separate tables for these
      const tripData = {
        destinations,
        daySchedules,
        travelDetails,
        accommodations
      };

      // For now, we'll store this in the trip_itinerary table as structured content
      const { error: itineraryError } = await supabase
        .from('trip_itinerary')
        .insert({
          trip_id: trip.id,
          day_number: 0, // Use 0 to indicate this is the master manual entry data
          content: JSON.stringify(tripData)
        });

      if (itineraryError) throw itineraryError;

      // Navigate to the trip page
      router.push(`/trips/${trip.id}`);
      onClose();
    } catch (error: any) {
      console.error('Error creating manual trip:', error);
      setError(error.message || 'Failed to create trip');
    } finally {
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
        return true; // Accommodation details are optional
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <MotionDiv
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold">Manual Trip Entry</h2>
              <p className="text-blue-100">Step {currentStep} of {totalSteps}: {stepTitles[currentStep - 1]}</p>
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
          
          {/* Progress Bar */}
          <div className="mt-4 bg-white/20 rounded-full h-2">
            <div 
              className="bg-white rounded-full h-2 transition-all duration-300"
              style={{ width: `${(currentStep / totalSteps) * 100}%` }}
            />
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md flex items-center">
              <AlertTriangle className="w-5 h-5 text-red-500 mr-2" />
              <span className="text-red-700">{error}</span>
            </div>
          )}

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
                <h3 className="text-lg font-semibold">Destinations</h3>
                <Button onClick={addDestination} size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Destination
                </Button>
              </div>
              
              {destinations.map((destination, index) => (
                <Card key={destination.id} className="p-4">
                  <div className="flex justify-between items-start mb-4">
                    <Badge variant="outline">Destination {index + 1}</Badge>
                    {destinations.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeDestination(destination.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
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
                </Card>
              ))}
              
              {destinations.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <MapPin className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No destinations added yet. Click "Add Destination" to start.</p>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Daily Schedule */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Daily Schedule</h3>
                <Button onClick={addDaySchedule} size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Day
                </Button>
              </div>
              
              {daySchedules.map((day, index) => (
                <Card key={day.id} className="p-4">
                  <div className="flex justify-between items-start mb-4">
                    <Badge variant="outline">Day {day.day}</Badge>
                    {daySchedules.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeDaySchedule(day.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                  
                  <div className="space-y-4">
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
                        placeholder="Additional notes or reminders..."
                        className="w-full"
                        rows={2}
                      />
                    </div>
                  </div>
                </Card>
              ))}
              
              {daySchedules.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No daily schedule added yet. Click "Add Day" to start.</p>
                </div>
              )}
            </div>
          )}

          {/* Step 4: Travel Details */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Travel Details</h3>
                <Button onClick={addTravelDetails} size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Travel
                </Button>
              </div>
              
              {travelDetails.map((travel, index) => (
                <Card key={travel.id} className="p-4">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center">
                      {getTravelModeIcon(travel.mode)}
                      <Badge variant="outline" className="ml-2">Travel {index + 1}</Badge>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeTravelDetails(travel.id)}
                      className="text-red-500 hover:text-red-700"
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
                        className="w-full p-2 border border-gray-300 rounded-md"
                      >
                        <option value="flight">Flight</option>
                        <option value="train">Train</option>
                        <option value="car">Car</option>
                        <option value="bus">Bus</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Details
                      </label>
                      <Textarea
                        value={travel.details}
                        onChange={(e) => updateTravelDetails(travel.id, 'details', e.target.value)}
                        placeholder="Flight number, route, or other travel details..."
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
                          placeholder="Phone or email"
                          className="w-full"
                        />
                      </div>
                    </div>
                  </div>
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
                <h3 className="text-lg font-semibold">Accommodation</h3>
                <Button onClick={addAccommodation} size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Accommodation
                </Button>
              </div>
              
              {accommodations.map((accommodation, index) => (
                <Card key={accommodation.id} className="p-4">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center">
                      <Hotel className="w-4 h-4" />
                      <Badge variant="outline" className="ml-2">Accommodation {index + 1}</Badge>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeAccommodation(accommodation.id)}
                      className="text-red-500 hover:text-red-700"
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
                        placeholder="Hotel name"
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
            >
              Next
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || !isStepValid(currentStep)}
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
