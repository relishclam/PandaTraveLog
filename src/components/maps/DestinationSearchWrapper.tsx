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
  onDestinationSelect: (destination: Destination) => void;
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
    // Handle single destination selection
    if (!Array.isArray(destination)) {
      onDestinationSelect(destination);
    } 
    // If we get an array (from multi-select mode), take the first one
    else if (destination.length > 0) {
      onDestinationSelect(destination[0]);
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
      />
    </div>
  );
};

export default DestinationSearchWrapper;
