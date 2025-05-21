'use client';

import React from 'react';
import { PandaAssistant } from './PandaAssistant';
import { usePandaAssistant } from '@/contexts/PandaAssistantContext';

export const GlobalPandaAssistant: React.FC = () => {
  const { state, hideMainAssistant, hideFloatingAssistant } = usePandaAssistant();

  // Determine if we're on the search page with an error
  const isOnSearchPage = typeof window !== 'undefined' && 
    window.location.pathname.includes('/trips/new');

  // Choose appropriate position for floating assistant based on current page
  const floatingPosition = isOnSearchPage ? "center" : "top-left";

  return (
    <>
      {/* Main assistant - fixed at bottom right */}
      <PandaAssistant
        message={state.mainAssistant.message || undefined}
        emotion={state.mainAssistant.emotion}
        showMessage={!!state.mainAssistant.message}
        position="bottom-right"
        size="md"
        initiallyVisible={state.mainAssistant.visible}
        onMessageClose={hideMainAssistant}
      />

      {/* Optional floating assistant - only shown when needed */}
      {state.floatingAssistant.visible && (
        <PandaAssistant
          message={state.floatingAssistant.message || undefined}
          emotion={state.floatingAssistant.emotion}
          showMessage={!!state.floatingAssistant.message}
          position={floatingPosition}
          size="sm"
          initiallyVisible={true}
          onMessageClose={hideFloatingAssistant}
        />
      )}
    </>
  );
};
