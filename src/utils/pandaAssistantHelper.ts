'use client';

/**
 * Helper functions for using the Panda Assistant across the application
 */

import { usePandaAssistant } from '@/contexts/PandaAssistantContext';

type Emotion = 'happy' | 'thinking' | 'excited' | 'confused' | 'sad';

/**
 * Hook to access the Panda Assistant functionality with simplified methods
 * This provides a cleaner API for components to use
 */
export function usePandaHelper() {
  const {
    state,
    showMainAssistant,
    hideMainAssistant,
    showFloatingAssistant,
    hideFloatingAssistant,
    hideAllAssistants
  } = usePandaAssistant();

  return {
    // Main assistant methods
    showPanda: (message?: string, emotion: Emotion = 'happy') => showMainAssistant(message, emotion),
    hidePanda: () => hideMainAssistant(),
    
    // Floating assistant methods (for temporary messages that shouldn't block main content)
    showFloatingPanda: (message?: string, emotion: Emotion = 'happy') => showFloatingAssistant(message, emotion),
    hideFloatingPanda: () => hideFloatingAssistant(),
    
    // Hide all assistants
    hideAll: () => hideAllAssistants(),
    
    // Get current state
    isPandaVisible: state.mainAssistant.visible,
    isFloatingPandaVisible: state.floatingAssistant.visible,
    
    // Current messages
    mainMessage: state.mainAssistant.message,
    floatingMessage: state.floatingAssistant.message
  };
}
