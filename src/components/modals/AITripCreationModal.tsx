'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { X, MessageCircle, Sparkles, Clock, MapPin } from 'lucide-react';
import { usePOAssistant } from '@/contexts/POAssistantContext';

interface AITripCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (tripId: string) => void;
}

export default function AITripCreationModal({ 
  isOpen, 
  onClose, 
  onSuccess 
}: AITripCreationModalProps) {
  const { setContext, showPO } = usePOAssistant();
  const [isStarting, setIsStarting] = useState(false);

  if (!isOpen) return null;

  const startAITripCreation = async () => {
    setIsStarting(true);
    
    // Set PO context to trip creation
    setContext('trip_creation');
    
    // Show PO Assistant
    showPO();
    
    // Close this modal
    onClose();
    
    setIsStarting(false);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-md mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">AI Trip Creation</h2>
              <p className="text-sm text-gray-600">Let PO Assistant help you plan</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* AI Features */}
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-green-600" />
              What PO Assistant can do:
            </h3>
            
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
                <MapPin className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-green-900">Smart Destination Planning</p>
                  <p className="text-sm text-green-700">
                    Get personalized recommendations based on your preferences, budget, and travel style.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                <Clock className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-blue-900">Complete Itinerary Generation</p>
                  <p className="text-sm text-blue-700">
                    Creates detailed day-by-day schedules with activities, dining, and timing.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-purple-50 rounded-lg">
                <Sparkles className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-purple-900">Budget & Logistics</p>
                  <p className="text-sm text-purple-700">
                    Estimates costs, finds accommodations, and handles practical details.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* How it works */}
          <div className="border-t pt-4">
            <h4 className="font-medium text-gray-900 mb-3">How it works:</h4>
            <div className="space-y-2 text-sm text-gray-600">
              <p className="flex items-center gap-2">
                <span className="w-5 h-5 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-xs font-bold">1</span>
                Chat with PO Assistant about your trip preferences
              </p>
              <p className="flex items-center gap-2">
                <span className="w-5 h-5 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-xs font-bold">2</span>
                PO creates a complete trip diary automatically
              </p>
              <p className="flex items-center gap-2">
                <span className="w-5 h-5 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-xs font-bold">3</span>
                Review, edit, and customize your itinerary
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1"
            disabled={isStarting}
          >
            Cancel
          </Button>
          <Button
            onClick={startAITripCreation}
            disabled={isStarting}
            className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
          >
            {isStarting ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Starting...
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <MessageCircle className="w-4 h-4" />
                Start AI Planning
              </div>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
