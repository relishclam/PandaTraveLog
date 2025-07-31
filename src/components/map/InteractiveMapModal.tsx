import React from 'react';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { X, MapPin, Plus } from 'lucide-react';
import { useOpenRouter } from '@/hooks/useOpenRouter';
import { PoGuide } from '@/components/po/svg/PoGuide';

interface InteractiveMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  destination: string;
}

export function InteractiveMapModal({ isOpen, onClose, destination }: InteractiveMapModalProps) {
  const {
    selectedLocations,
    mapCenter,
    handleMapClick,
    isLoading
  } = useOpenRouter();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 p-4 overflow-y-auto">
        <div className="bg-white rounded-2xl w-full max-w-3xl my-4 relative">
          {/* Header */}
          <div className="p-4 border-b">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <PoGuide type="guide" size="small" message="Let's plan your trip!" />
                <h2 className="text-xl font-bold">Explore {destination}</h2>
              </div>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* Map Section */}
          <div className="p-4 bg-gray-50">
            <div className="w-full h-[40vh] bg-gradient-to-br from-blue-100 via-green-50 to-blue-100 rounded-lg relative">
              {/* Map content */}
              <PoGuide 
                type="map" 
                size="small" 
                message="Click anywhere to add a location!"
                className="absolute top-3 left-3 z-10" 
              />
              
              {/* Map Markers */}
              {selectedLocations.map((location) => (
                <div
                  key={location.id}
                  className="absolute w-8 h-8 bg-gradient-to-r from-red-500 to-pink-500 rounded-full flex items-center justify-center transform -translate-x-1/2 -translate-y-1/2"
                  style={{
                    left: `${((location.lng - mapCenter[1]) * 100) + 50}%`,
                    top: `${((location.lat - mapCenter[0]) * -100) + 50}%`
                  }}
                >
                  <MapPin className="w-4 h-4 text-white" />
                </div>
              ))}
            </div>

            {/* Selected Locations List */}
            {selectedLocations.length > 0 && (
              <div className="mt-4 p-4 bg-white rounded-lg border">
                <h3 className="font-semibold mb-2">Selected Spots ({selectedLocations.length})</h3>
                <div className="grid gap-2 max-h-32 overflow-y-auto">
                  {selectedLocations.map((location) => (
                    <div key={location.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                      <span>{location.name}</span>
                      <Button variant="ghost" size="sm">
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Trip Configuration - Stepped Form */}
          <div className="p-4">
            <div className="flex items-center gap-3 mb-4">
              <PoGuide type="assistant" size="small" message="Tell me about your trip!" />
              <h3 className="font-semibold">Trip Details</h3>
            </div>

            {/* Stepped Form */}
            <div className="space-y-4">
              {/* Duration */}
              <div className="bg-gray-50 p-4 rounded-lg">
                {/* ...form fields... */}
              </div>

              {/* Next/Submit Button */}
              <Button 
                className="w-full bg-gradient-to-r from-orange-500 to-red-500"
                disabled={isLoading || selectedLocations.length === 0}
              >
                <Plus className="w-4 h-4 mr-2" />
                Generate PO's Itinerary
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Dialog>
  );
}
