'use client';

import React from 'react';
import { usePOAssistant } from '@/contexts/POAssistantContext';
import UnifiedPOAssistant from './UnifiedPOAssistant';
import { useRouter } from 'next/navigation';

export const GlobalPOAssistant: React.FC = () => {
  const { state, minimizePO, expandPO, hidePO } = usePOAssistant();
  const router = useRouter();

  if (!state.isVisible) {
    return null;
  }

  const handleTripCreated = (tripId: string) => {
    // Navigate to the trip diary
    router.push(`/trips/${tripId}/diary`);
    // Keep PO visible but minimized for continued assistance
    minimizePO();
  };

  const handleMinimize = () => {
    if (state.isMinimized) {
      expandPO();
    } else {
      minimizePO();
    }
  };

  // Render based on context and minimized state
  if (state.currentContext === 'diary' || state.currentContext === 'manual_entry') {
    // For trip diary and manual entry, show as persistent bottom chat (Cascade-style)
    return (
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 shadow-lg">
        <div className={`transition-all duration-300 ${state.isMinimized ? 'h-16' : 'h-96'}`}>
          {state.isMinimized ? (
            // Minimized header bar
            <div className="h-16 flex items-center justify-between px-4 bg-orange-50 border-b border-orange-200">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-bold">PO</span>
                </div>
                <span className="font-medium text-gray-900">PO Assistant</span>
                <span className="text-sm text-gray-600">Ready to help with your trip</span>
              </div>
              <button
                onClick={handleMinimize}
                className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
              >
                Chat with PO
              </button>
            </div>
          ) : (
            // Expanded chat interface
            <UnifiedPOAssistant
              tripId={state.currentTripId}
              context={state.currentContext}
              isMinimized={false}
              onMinimize={handleMinimize}
              onTripCreated={handleTripCreated}
              className="h-full"
            />
          )}
        </div>
      </div>
    );
  }

  // For other contexts, show as floating assistant
  return (
    <UnifiedPOAssistant
      tripId={state.currentTripId}
      context={state.currentContext}
      isMinimized={state.isMinimized}
      onMinimize={handleMinimize}
      onTripCreated={handleTripCreated}
    />
  );
};
