// src/components/po/AIDiaryAdoptionModal.tsx
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Calendar, MapPin, Clock, DollarSign, Sparkles } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { ScrollArea } from '@/components/ui/ScrollArea';

interface GeneratedItineraryItem {
  day_number: number;
  date: string;
  title: string;
  description: string;
  activity_type: 'sightseeing' | 'dining' | 'accommodation' | 'transport' | 'activity' | 'shopping' | 'other';
  location?: string;
  start_time?: string;
  end_time?: string;
  estimated_cost?: number;
  notes?: string;
}

interface GeneratedTripDiary {
  trip_title: string;
  destination: string;
  start_date: string;
  end_date: string;
  total_days: number;
  itinerary: GeneratedItineraryItem[];
  budget_estimate?: {
    total: number;
    currency: string;
    breakdown: {
      accommodation: number;
      food: number;
      transport: number;
      activities: number;
      other: number;
    };
  };
}

interface AIDiaryAdoptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  conversationId?: string;
  tripId?: string;
}

const activityIcons = {
  sightseeing: '🏛️',
  dining: '🍽️',
  accommodation: '🏨',
  transport: '🚗',
  activity: '🎯',
  shopping: '🛍️',
  other: '📝'
};

export const AIDiaryAdoptionModal: React.FC<AIDiaryAdoptionModalProps> = ({
  isOpen,
  onClose,
  conversationId,
  tripId
}) => {
  const { user } = useAuth();
  const router = useRouter();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [generatedDiary, setGeneratedDiary] = useState<GeneratedTripDiary | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerateDiary = async () => {
    if (!user) return;

    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch('/api/po/generate-diary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          conversationId,
          tripId,
          userId: user.id
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate diary');
      }

      setGeneratedDiary(data.tripDiary);
    } catch (error) {
      console.error('Error generating diary:', error);
      setError(error instanceof Error ? error.message : 'Failed to generate diary');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAdoptDiary = async () => {
    if (!user || !generatedDiary) return;

    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch('/api/po/generate-diary', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          tripDiary: generatedDiary,
          userId: user.id,
          conversationId
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save diary');
      }

      // Navigate to the new trip diary
      router.push(`/trips/${data.tripId}/diary`);
      onClose();
    } catch (error) {
      console.error('Error saving diary:', error);
      setError(error instanceof Error ? error.message : 'Failed to save diary');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-4xl max-h-[90vh] p-0 gap-0 overflow-hidden">
        <DialogHeader className="p-4 sm:p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <Sparkles className="h-5 w-5 sm:h-6 sm:w-6 text-backpack-orange" />
            <DialogTitle className="text-lg sm:text-xl font-semibold text-panda-black">
              Create Trip Diary from PO Assistant Chat
            </DialogTitle>
          </div>
          <DialogDescription className="text-sm text-gray-600 mt-2">
            Transform your conversation with PO into a structured, editable trip diary
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 max-h-[calc(90vh-200px)]">
          <div className="p-4 sm:p-6">
            {!generatedDiary ? (
              <div className="text-center py-8 px-4">
                <div className="mb-6">
                  <Sparkles className="h-12 w-12 sm:h-16 sm:w-16 text-backpack-orange mx-auto mb-4" />
                  <h3 className="text-lg sm:text-xl font-medium text-panda-black mb-2">
                    Transform Your Chat into a Trip Diary
                  </h3>
                  <p className="text-gray-600 text-sm sm:text-base max-w-md mx-auto">
                    PO Assistant can analyze your conversation and create a structured, 
                    editable trip diary with detailed itinerary, activities, and budget estimates.
                  </p>
                </div>

                {error && (
                  <Card className="mb-4 border-red-200 bg-red-50">
                    <CardContent className="p-4">
                      <p className="text-red-600 text-sm">{error}</p>
                    </CardContent>
                  </Card>
                )}

                <Button
                  onClick={handleGenerateDiary}
                  disabled={isGenerating}
                  size="lg"
                  className="w-full sm:w-auto"
                >
                  {isGenerating ? (
                    <span className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                      <span>Generating Diary...</span>
                    </span>
                  ) : (
                    'Generate Trip Diary'
                  )}
                </Button>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Trip Overview */}
                <Card className="bg-bamboo-light/20 border-backpack-orange/20">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2 text-panda-black">
                      <Calendar className="h-5 w-5 text-backpack-orange" />
                      <span>{generatedDiary.trip_title}</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                      <div className="flex items-center space-x-2">
                        <MapPin className="h-4 w-4 text-gray-500" />
                        <span>{generatedDiary.destination}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Clock className="h-4 w-4 text-gray-500" />
                        <span>{generatedDiary.total_days} days</span>
                      </div>
                      {generatedDiary.budget_estimate && (
                        <div className="flex items-center space-x-2">
                          <DollarSign className="h-4 w-4 text-gray-500" />
                          <span>
                            {generatedDiary.budget_estimate.total} {generatedDiary.budget_estimate.currency}
                          </span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Itinerary Preview */}
                <div>
                  <h4 className="text-lg font-medium text-panda-black mb-4">Itinerary Preview</h4>
                  <div className="space-y-3">
                    {generatedDiary.itinerary.map((item, index) => (
                      <Card key={index} className="hover:bg-bamboo-light/10 transition-colors">
                        <CardContent className="p-4">
                          <div className="flex items-start space-x-3">
                            <span className="text-2xl">{activityIcons[item.activity_type]}</span>
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-1">
                                <Badge variant="secondary" className="bg-backpack-orange/10 text-backpack-orange">
                                  Day {item.day_number}
                                </Badge>
                                {item.start_time && (
                                  <span className="text-gray-500 text-sm">{item.start_time}</span>
                                )}
                              </div>
                              <h5 className="font-medium text-panda-black">{item.title}</h5>
                              <p className="text-gray-600 text-sm mt-1">{item.description}</p>
                              {item.location && (
                                <p className="text-gray-500 text-xs mt-1 flex items-center space-x-1">
                                  <MapPin className="h-3 w-3" />
                                  <span>{item.location}</span>
                                </p>
                              )}
                              {item.estimated_cost && (
                                <p className="text-green-600 text-sm mt-1">
                                  Est. Cost: {item.estimated_cost} {generatedDiary.budget_estimate?.currency || 'USD'}
                                </p>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>

                {/* Budget Breakdown */}
                {generatedDiary.budget_estimate && (
                  <Card className="bg-green-50 border-green-200">
                    <CardHeader>
                      <CardTitle className="text-lg font-medium text-panda-black">Budget Estimate</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-sm">
                        <div>
                          <span className="text-gray-600">Accommodation</span>
                          <p className="font-medium">{generatedDiary.budget_estimate.breakdown.accommodation} {generatedDiary.budget_estimate.currency}</p>
                        </div>
                        <div>
                          <span className="text-gray-600">Food</span>
                          <p className="font-medium">{generatedDiary.budget_estimate.breakdown.food} {generatedDiary.budget_estimate.currency}</p>
                        </div>
                        <div>
                          <span className="text-gray-600">Transport</span>
                          <p className="font-medium">{generatedDiary.budget_estimate.breakdown.transport} {generatedDiary.budget_estimate.currency}</p>
                        </div>
                        <div>
                          <span className="text-gray-600">Activities</span>
                          <p className="font-medium">{generatedDiary.budget_estimate.breakdown.activities} {generatedDiary.budget_estimate.currency}</p>
                        </div>
                        <div>
                          <span className="text-gray-600">Other</span>
                          <p className="font-medium">{generatedDiary.budget_estimate.breakdown.other} {generatedDiary.budget_estimate.currency}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Footer Actions */}
        {generatedDiary && (
          <div className="p-4 sm:p-6 border-t border-gray-200 bg-white">
            <div className="flex flex-col sm:flex-row justify-between items-center space-y-3 sm:space-y-0">
              <p className="text-sm text-gray-600">
                💡 This diary will be fully editable after creation
              </p>
              <div className="flex space-x-3 w-full sm:w-auto">
                <Button
                  variant="outline"
                  onClick={() => setGeneratedDiary(null)}
                  className="flex-1 sm:flex-none"
                >
                  Generate Again
                </Button>
                <Button
                  onClick={handleAdoptDiary}
                  disabled={isSaving}
                  className="flex-1 sm:flex-none bg-green-500 hover:bg-green-600"
                >
                  {isSaving ? (
                    <span className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                      <span>Creating...</span>
                    </span>
                  ) : (
                    'Create Trip Diary'
                  )}
                </Button>
              </div>
            </div>

            {error && (
              <Card className="mt-4 border-red-200 bg-red-50">
                <CardContent className="p-4">
                  <p className="text-red-600 text-sm">{error}</p>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
