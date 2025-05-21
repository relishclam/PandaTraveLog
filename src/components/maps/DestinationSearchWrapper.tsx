'use client';

import React, { useState } from 'react';
import DestinationSearchModal from './DestinationSearchModal';
import { PoGuide } from '@/components/po/svg/PoGuide';

type Destination = {
  place_id: string;
  name: string;
  formattedName: string;
  country: string;
  coordinates: [number, number];
};

interface DestinationSearchWrapperProps {
  /**
   * Handler for selected destinations. Always receives an array, even for single selection.
   * For single destination: use destinations[0]
   */
  onDestinationSelect: (destinations: Destination[]) => void;
  selectedDestination?: Destination | null;
  label?: string;
  placeholder?: string;
}

const DestinationSearchWrapper: React.FC<DestinationSearchWrapperProps> = ({ 
  onDestinationSelect, 
  selectedDestination = null,
  label = "Destination",
  placeholder = "Where would you like to go?"
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const handleDestinationSelect = (destination: Destination | Destination[]) => {
    // In multi-select mode, always get an array
    if (Array.isArray(destination)) {
      // Move on to next step with all selected destinations
      // (You may replace this with your next-step logic)
      onDestinationSelect(destination); // Pass the array to parent
    } else {
      // For single select fallback
      onDestinationSelect([destination]);
    }
  };
  
  return (
    <div className="relative w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}
      
      <button
        type="button"
        onClick={() => setIsModalOpen(true)}
        className="flex items-center w-full p-3 border-2 border-green-500 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-backpack-orange"
      >
        <div className="mr-3 text-green-600">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        
        <div className="flex-1 text-left">
          {selectedDestination ? (
            <div className="font-medium">
              {selectedDestination.name}
              <span className="ml-1 text-sm text-gray-500">
                {selectedDestination.country && selectedDestination.name !== selectedDestination.country 
                  ? `· ${selectedDestination.country}` 
                  : ''}
              </span>
            </div>
          ) : (
            <div className="text-gray-500">{placeholder}</div>
          )}
        </div>
      </button>
      
      {/* The modal */}
      <DestinationSearchModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSelect={handleDestinationSelect}
        multiSelect={true}
      />
    </div>
  );
};

export default DestinationSearchWrapper;
