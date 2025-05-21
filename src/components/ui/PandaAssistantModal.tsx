'use client';

import React from 'react';
import { motion, AnimatePresence, HTMLMotionProps } from 'framer-motion';
import { PoGuide } from '@/components/po/svg/PoGuide';

type Destination = {
  place_id: string;
  name: string;
  formattedName: string;
  country: string;
  coordinates: [number, number];
};

interface PandaAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  destinations: Destination[];
  onAddMore: () => void;
}

const PandaAssistantModal: React.FC<PandaAssistantModalProps> = ({ 
  isOpen, 
  onClose, 
  destinations, 
  onAddMore 
}) => {
  const overlayStyle: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    zIndex: 50,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)'
  };

  const modalStyle: React.CSSProperties = {
    position: 'relative',
    width: '100%',
    maxWidth: '28rem',
    padding: '1.5rem',
    backgroundColor: 'white',
    borderRadius: '0.75rem',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
  };
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          style={overlayStyle}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onTap={onClose}
        >
          <motion.div
            style={modalStyle}
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.7, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            onTap={(e: Event) => e.stopPropagation()}
          >
            <div className="flex flex-col items-center">
              <div className="w-24 h-24 mb-4">
                <PoGuide
                  message={`Great! You've selected ${destinations.length > 1 ? `${destinations.length} places` : destinations[0].name}! Would you like to add more destinations?`}
                  type="excited"
                  size="medium"
                  animated={true}
                />
              </div>
              
              <h3 className="text-xl font-bold text-center mb-2">Your Selected Destinations</h3>
              
              <div className="w-full bg-gray-50 p-3 rounded-lg mb-4 max-h-40 overflow-y-auto">
                {destinations.map((dest, index) => (
                  <div key={index} className="flex items-center py-2 border-b last:border-b-0">
                    <div className="w-8 h-8 flex items-center justify-center bg-green-100 text-green-800 rounded-full mr-3">
                      {index + 1}
                    </div>
                    <div>
                      <div className="font-medium">{dest.name}</div>
                      <div className="text-sm text-gray-600">{dest.formattedName}</div>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="flex space-x-3 w-full">
                <button
                  className="flex-1 py-3 bg-white border-2 border-backpack-orange text-backpack-orange rounded-lg font-medium hover:bg-backpack-orange/10 transition-colors"
                  onClick={onAddMore}
                >
                  Add More Destinations
                </button>
                <button
                  className="flex-1 py-3 bg-backpack-orange text-white rounded-lg font-medium hover:bg-backpack-orange/90 transition-colors"
                  onClick={onClose}
                >
                  Continue with These
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default PandaAssistantModal;
