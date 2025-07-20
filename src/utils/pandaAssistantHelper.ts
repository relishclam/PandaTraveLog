'use client';

/**
 * Helper functions for using the PO Assistant across the application
 */

import { usePOAssistant } from '@/contexts/POAssistantContext';

/**
 * Hook to access the PO Assistant functionality with simplified methods
 * This provides a cleaner API for components to use
 */
export function usePandaHelper() {
  const {
    state,
    showPO,
    hidePO,
    setContext
  } = usePOAssistant();

  return {
    // Main assistant methods
    showPanda: (message?: string) => {
      setContext('marketing');
      showPO();
    },
    hidePanda: () => hidePO(),
    
    // Floating assistant methods (for backward compatibility)
    showFloatingPanda: (message?: string) => {
      setContext('marketing');
      showPO();
    },
    hideFloatingPanda: () => hidePO(),
    
    // Hide all assistants
    hideAll: () => hidePO(),
    
    // Get current state
    isPandaVisible: state.isVisible,
    isFloatingPandaVisible: state.isVisible,
    
    // Current messages (simplified for backward compatibility)
    mainMessage: '',
    floatingMessage: ''
  };
}
