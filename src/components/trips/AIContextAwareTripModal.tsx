'use client';

import React, { useState, useEffect } from 'react';
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
  Sparkles,
  Clock,
  DollarSign,
  Users,
  AlertTriangle,
  Wand2,
  CheckCircle,
  ChevronRight,
  ChevronLeft
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useTripCreation, TripCreationProvider } from '@/contexts/TripCreationContext';

interface AIContextAwareTripModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (tripId: string) => void;
}

// Step 1: Basic Trip Information with AI Context Setup
const Step1BasicInfo: React.FC = () => {
  const { state, setBasicInfo, setStep } = useTripCreation();
  const [localData, setLocalData] = useState({
    tripName: state.tripName,
    startDate: state.startDate,
    endDate: state.endDate,
    budget: state.budget || 0,
  });

  const handleNext = () => {
    setBasicInfo(localData);
    setStep(2);
  };

  // Calculate trip duration
  const duration = localData.startDate && localData.endDate 
    ? Math.ceil((new Date(localData.endDate).getTime() - new Date(localData.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1
    : 0;

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-backpack-orange" />
          Step 1: Trip Details
        </CardTitle>
        <p className="text-sm text-gray-600">Tell us about your trip so we can provide personalized suggestions</p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <label className="block text-sm font-medium mb-2">Trip Name</label>
          <Input
            value={localData.tripName}
            onChange={(e) => setLocalData(prev => ({ ...prev, tripName: e.target.value }))}
            placeholder="e.g., Summer Adventure in Europe"
            className="w-full"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Start Date</label>
            <Input
              type="date"
              value={localData.startDate}
              onChange={(e) => setLocalData(prev => ({ ...prev, startDate: e.target.value }))}
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">End Date</label>
            <Input
              type="date"
              value={localData.endDate}
              onChange={(e) => setLocalData(prev => ({ ...prev, endDate: e.target.value }))}
              className="w-full"
            />
          </div>
        </div>

        {duration > 0 && (
          <div className="p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-700 font-medium">
              Trip Duration: {duration} day{duration !== 1 ? 's' : ''}
            </p>
            <p className="text-xs text-blue-600 mt-1">
              We'll automatically create a daily schedule for your trip
            </p>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium mb-2">Budget (Optional)</label>
          <div className="relative">
            <DollarSign className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
            <Input
              type="number"
              value={localData.budget}
              onChange={(e) => setLocalData(prev => ({ ...prev, budget: parseInt(e.target.value) || 0 }))}
              placeholder="Total budget for the trip"
              className="pl-10"
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">
            This helps us provide budget-appropriate suggestions
          </p>
        </div>

        <Button 
          onClick={handleNext}
          disabled={!localData.tripName || !localData.startDate || !localData.endDate}
          className="w-full bg-backpack-orange hover:bg-backpack-orange/90"
        >
          Continue to Destinations
          <ChevronRight className="w-4 h-4 ml-2" />
        </Button>
      </CardContent>
    </Card>
  );
};

// Step 2: AI-Enhanced Destination Selection
const Step2Destinations: React.FC = () => {
  const { state, addDestination, updateDestination, removeDestination, setStep, generateAIDestinationSuggestions, getLocationDetails } = useTripCreation();
  const [searchQuery, setSearchQuery] = useState('');
  const [aiSuggestions, setAiSuggestions] = useState<any[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);

  const handleAISearch = async () => {
    if (!searchQuery.trim()) return;
    
    setIsLoadingSuggestions(true);
    try {
      const suggestions = await generateAIDestinationSuggestions(searchQuery);
      // Handle both array and object responses from AI API
      if (Array.isArray(suggestions)) {
        setAiSuggestions(suggestions);
      } else if (suggestions && (suggestions as any).destinations) {
        setAiSuggestions((suggestions as any).destinations);
      } else {
        setAiSuggestions([]);
      }
    } catch (error) {
      console.error('AI suggestions failed:', error);
      setAiSuggestions([]);
    }
    setIsLoadingSuggestions(false);
  };

  const addDestinationFromAI = async (suggestion: any) => {
    const locationDetails = await getLocationDetails(suggestion.name);
    
    const newDestination = {
      id: Date.now().toString(),
      name: suggestion.name,
      address: suggestion.address || `${suggestion.name}, ${suggestion.country}`,
      coordinates: suggestion.coordinates,
      country: suggestion.country,
      currency: suggestion.currency,
      keyAttractions: suggestion.keyAttractions,
      estimatedDailyBudget: suggestion.estimatedDailyBudget,
      reasoning: suggestion.reasoning,
    };
    
    addDestination(newDestination);
  };

  const addManualDestination = () => {
    const newDestination = {
      id: Date.now().toString(),
      name: '',
      address: '',
    };
    addDestination(newDestination);
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="w-5 h-5 text-backpack-orange" />
          Step 2: Destinations
        </CardTitle>
        <p className="text-sm text-gray-600">Where would you like to go? Get AI-powered suggestions or add manually</p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* AI Suggestion Search */}
        <div className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-5 h-5 text-purple-600" />
            <h3 className="font-medium text-purple-900">AI Destination Suggestions</h3>
          </div>
          <div className="flex gap-2">
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Describe your ideal destination... (e.g., 'tropical beaches with culture' or 'European cities with history')"
              className="flex-1"
              onKeyPress={(e) => e.key === 'Enter' && handleAISearch()}
            />
            <Button 
              onClick={handleAISearch}
              disabled={isLoadingSuggestions || !searchQuery.trim()}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {isLoadingSuggestions ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Wand2 className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>

        {/* AI Suggestions */}
        {aiSuggestions.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium text-gray-900">AI Recommendations for your trip:</h4>
            <div className="grid gap-3">
              {aiSuggestions.map((suggestion, index) => (
                <div key={index} className="p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h5 className="font-medium text-gray-900">{suggestion.name}, {suggestion.country}</h5>
                      <p className="text-sm text-gray-600 mt-1">{suggestion.reasoning}</p>
                      <div className="flex gap-2 mt-2">
                        <Badge variant="outline" className="text-xs">
                          {suggestion.currency?.code} {suggestion.currency?.symbol}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {suggestion.budgetCategory}
                        </Badge>
                      </div>
                      <div className="mt-2">
                        <p className="text-xs text-gray-500">Key attractions:</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {suggestion.keyAttractions?.slice(0, 3).map((attraction: string, i: number) => (
                            <Badge key={i} variant="secondary" className="text-xs">
                              {attraction}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => addDestinationFromAI(suggestion)}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Current Destinations */}
        <div>
          <div className="flex justify-between items-center mb-3">
            <h4 className="font-medium text-gray-900">Your Destinations ({state.destinations.length})</h4>
            <Button
              size="sm"
              onClick={addManualDestination}
              variant="outline"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Manually
            </Button>
          </div>
          
          <div className="space-y-2">
            {state.destinations.map((destination, index) => (
              <div key={destination.id} className="p-3 border rounded-lg">
                <div className="flex gap-3 items-start">
                  <div className="flex-1 grid grid-cols-2 gap-3">
                    <Input
                      value={destination.name}
                      onChange={(e) => updateDestination(destination.id, { name: e.target.value })}
                      placeholder="Destination name"
                    />
                    <Input
                      value={destination.address || ''}
                      onChange={(e) => updateDestination(destination.id, { address: e.target.value })}
                      placeholder="Address (optional)"
                    />
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => removeDestination(destination.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                {destination.keyAttractions && (
                  <div className="mt-2">
                    <p className="text-xs text-gray-500 mb-1">Suggested attractions:</p>
                    <div className="flex flex-wrap gap-1">
                      {destination.keyAttractions.slice(0, 3).map((attraction: string, i: number) => (
                        <Badge key={i} variant="secondary" className="text-xs">
                          {attraction}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex justify-between pt-4">
          <Button
            onClick={() => setStep(1)}
            variant="outline"
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <Button 
            onClick={() => setStep(3)}
            disabled={state.destinations.length === 0}
            className="bg-backpack-orange hover:bg-backpack-orange/90"
          >
            Continue to Schedule
            <ChevronRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

// Step 3: AI-Enhanced Daily Schedule
const Step3Schedule: React.FC = () => {
  const { state, updateDaySchedule, setStep, generateAIActivitySuggestions } = useTripCreation();
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [aiSuggestions, setAiSuggestions] = useState<any>(null);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);

  const generateSuggestionsForDay = async (daySchedule: any) => {
    if (!state.destinations.length) return;
    
    setIsLoadingSuggestions(true);
    setSelectedDay(daySchedule.id);
    
    try {
      // Use the first destination for now - could be enhanced to consider all destinations
      const primaryDestination = state.destinations[0];
      const suggestions = await generateAIActivitySuggestions(primaryDestination.name, daySchedule.date);
      setAiSuggestions(suggestions);
    } catch (error) {
      console.error('Activity suggestions failed:', error);
    }
    setIsLoadingSuggestions(false);
  };

  const applyAISuggestion = (suggestion: any) => {
    if (!selectedDay) return;
    
    const currentSchedule = state.daySchedules.find(d => d.id === selectedDay);
    if (!currentSchedule) return;

    const updatedActivities = currentSchedule.activities 
      ? `${currentSchedule.activities}\n\n• ${suggestion.name} (${suggestion.duration})\n  ${suggestion.description}`
      : `• ${suggestion.name} (${suggestion.duration})\n  ${suggestion.description}`;

    updateDaySchedule(selectedDay, { activities: updatedActivities });
  };

  return (
    <Card className="w-full max-w-6xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-backpack-orange" />
          Step 3: Daily Schedule
        </CardTitle>
        <p className="text-sm text-gray-600">
          Plan your activities for each day. Get AI suggestions based on your destinations and dates.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Day Schedules */}
          <div className="space-y-3">
            <h4 className="font-medium text-gray-900">Daily Schedule ({state.daySchedules.length} days)</h4>
            {state.daySchedules.map((day, index) => (
              <div key={day.id} className="p-4 border rounded-lg">
                <div className="flex justify-between items-center mb-3">
                  <div>
                    <h5 className="font-medium">Day {day.day}</h5>
                    <p className="text-sm text-gray-600">{new Date(day.date).toLocaleDateString()}</p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => generateSuggestionsForDay(day)}
                    disabled={isLoadingSuggestions || !state.destinations.length}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    {isLoadingSuggestions && selectedDay === day.id ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Sparkles className="w-4 h-4" />
                    )}
                  </Button>
                </div>
                
                <Textarea
                  value={day.activities}
                  onChange={(e) => updateDaySchedule(day.id, { activities: e.target.value })}
                  placeholder="Describe your planned activities for this day..."
                  className="mb-2"
                  rows={4}
                />
                
                <Input
                  value={day.notes || ''}
                  onChange={(e) => updateDaySchedule(day.id, { notes: e.target.value })}
                  placeholder="Additional notes (optional)"
                  className="text-sm"
                />
              </div>
            ))}
          </div>

          {/* AI Suggestions Panel */}
          <div className="space-y-3">
            <h4 className="font-medium text-gray-900">AI Activity Suggestions</h4>
            {selectedDay && aiSuggestions ? (
              <div className="p-4 bg-gradient-to-br from-purple-50 to-blue-50 rounded-lg border">
                <h5 className="font-medium text-purple-900 mb-2">
                  Suggestions for Day {state.daySchedules.find(d => d.id === selectedDay)?.day}
                </h5>
                <p className="text-sm text-purple-700 mb-4">{aiSuggestions.dayOverview}</p>
                
                <div className="space-y-2 mb-4">
                  {aiSuggestions.activities?.map((activity: any, index: number) => (
                    <div key={index} className="p-3 bg-white rounded border">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h6 className="font-medium text-sm">{activity.name}</h6>
                          <p className="text-xs text-gray-600 mt-1">{activity.description}</p>
                          <div className="flex gap-2 mt-2">
                            <Badge variant="outline" className="text-xs">{activity.duration}</Badge>
                            <Badge variant="outline" className="text-xs">{activity.estimatedCost}</Badge>
                            <Badge variant="outline" className="text-xs">{activity.bestTime}</Badge>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => applyAISuggestion(activity)}
                          className="bg-green-600 hover:bg-green-700 ml-2"
                        >
                          <Plus className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                {aiSuggestions.localTips && (
                  <div>
                    <h6 className="font-medium text-sm mb-2">Local Tips:</h6>
                    <div className="space-y-1">
                      {aiSuggestions.localTips.map((tip: string, index: number) => (
                        <p key={index} className="text-xs text-purple-700">• {tip}</p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-8 text-center text-gray-500 border rounded-lg">
                <Sparkles className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                <p className="text-sm">Click the AI button on any day to get personalized activity suggestions</p>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex justify-between pt-4">
          <Button
            onClick={() => setStep(2)}
            variant="outline"
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <Button 
            onClick={() => setStep(4)}
            className="bg-backpack-orange hover:bg-backpack-orange/90"
          >
            Continue to Travel Details
            <ChevronRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

// Main Modal Component
const AIContextAwareTripModalContent: React.FC<AIContextAwareTripModalProps> = ({ 
  isOpen, 
  onClose,
  onSuccess
}) => {
  const { state, resetTrip } = useTripCreation();
  const { user } = useAuth();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      resetTrip();
    }
  }, [isOpen, resetTrip]);

  const handleSubmit = async () => {
    if (!user) return;
    
    setIsSubmitting(true);
    try {
      const tripData = {
        user_id: user.id,
        name: state.tripName,
        destination: state.destinations.map(d => d.name).join(', '),
        start_date: state.startDate,
        end_date: state.endDate,
        budget: state.budget,
        description: `AI-enhanced trip with ${state.destinations.length} destinations`,
        interests: state.destinations.flatMap(d => d.keyAttractions || []),
        day_schedules: state.daySchedules,
        destinations_data: state.destinations,
        ai_context: state.aiContext,
      };

      const response = await fetch('/api/trips/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tripData),
      });

      if (!response.ok) throw new Error('Failed to create trip');

      const result = await response.json();
      onSuccess?.(result.id);
      onClose();
      router.push(`/trips/${result.id}/diary`);
    } catch (error) {
      console.error('Trip creation failed:', error);
    }
    setIsSubmitting(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-7xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              AI-Enhanced Trip Creation
            </h2>
            <Button
              onClick={onClose}
              variant="outline"
              size="sm"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Step Progress */}
          <div className="mb-6">
            <div className="flex items-center justify-center space-x-4">
              {[1, 2, 3, 4, 5].map((step) => (
                <div key={step} className="flex items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    step <= state.currentStep 
                      ? 'bg-backpack-orange text-white' 
                      : 'bg-gray-200 text-gray-600'
                  }`}>
                    {step < state.currentStep ? (
                      <CheckCircle className="w-4 h-4" />
                    ) : (
                      step
                    )}
                  </div>
                  {step < 5 && (
                    <div className={`w-12 h-1 mx-2 ${
                      step < state.currentStep ? 'bg-backpack-orange' : 'bg-gray-200'
                    }`} />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Step Content */}
          {state.currentStep === 1 && <Step1BasicInfo />}
          {state.currentStep === 2 && <Step2Destinations />}
          {state.currentStep === 3 && <Step3Schedule />}
          {state.currentStep === 4 && (
            <div className="text-center p-8">
              <p className="text-gray-600 mb-4">Travel details and accommodations steps coming soon...</p>
              <Button 
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="bg-backpack-orange hover:bg-backpack-orange/90"
              >
                {isSubmitting ? 'Creating Trip...' : 'Create Trip'}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Wrapper with Provider
const AIContextAwareTripModal: React.FC<AIContextAwareTripModalProps> = (props) => {
  return (
    <TripCreationProvider>
      <AIContextAwareTripModalContent {...props} />
    </TripCreationProvider>
  );
};

export default AIContextAwareTripModal;
