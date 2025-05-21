'use client';

import React from 'react';
import { PandaAssistant } from './PandaAssistant';
import { usePandaAssistant } from '@/contexts/PandaAssistantContext';

export const GlobalPandaAssistant: React.FC = () => {
  const { state, hideMainAssistant } = usePandaAssistant();

  // Combine messages from both assistants if floating assistant is visible
  const combinedMessage = state.floatingAssistant.visible && state.floatingAssistant.message
    ? state.floatingAssistant.message
    : state.mainAssistant.message || undefined;
    
  // Use floating assistant emotion if it's visible, otherwise use main assistant emotion
  const combinedEmotion = state.floatingAssistant.visible
    ? state.floatingAssistant.emotion
    : state.mainAssistant.emotion;

  return (
    <>
      {/* Single assistant at bottom right that combines functionality */}
      <PandaAssistant
        message={combinedMessage}
        emotion={combinedEmotion}
        showMessage={!!combinedMessage}
        position="bottom-right"
        size="md"
        initiallyVisible={state.mainAssistant.visible}
        onMessageClose={hideMainAssistant}
      />
    </>
  );

};
