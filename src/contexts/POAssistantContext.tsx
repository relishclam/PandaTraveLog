'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { usePathname } from 'next/navigation';

export type POContext = 
  | 'marketing'      // For landing/pre-auth
  | 'trip_creation'  // For new trip creation
  | 'diary'         // For trip diary viewing/editing
  | 'manual_entry'  // For manual trip entry
  | 'dashboard'     // For trips dashboard
  | 'trip_enhancement' // For enhancing existing trips
  | 'trip_planning'; // For trip planning/itinerary

interface POAssistantState {
  isVisible: boolean;
  isMinimized: boolean;
  currentContext: POContext;
  currentTripId?: string;
  showPreAuthNotice: boolean;
  isModalOpen: boolean; // ✅ NEW: Track modal state
}

interface POAssistantContextType {
  state: POAssistantState;
  showPO: () => void;
  hidePO: () => void;
  minimizePO: () => void;
  expandPO: () => void;
  setContext: (context: POAssistantState['currentContext'], tripId?: string) => void;
  togglePO: () => void;
  setModalOpen: (isOpen: boolean) => void; // ✅ NEW: Modal control
}

const initialState: POAssistantState = {
  isVisible: false,
  isMinimized: true,
  currentContext: 'dashboard',
  currentTripId: undefined,
  showPreAuthNotice: false,
  isModalOpen: false // ✅ NEW: Initialize modal state
};

const POAssistantContext = createContext<POAssistantContextType | undefined>(undefined);

export const POAssistantProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const pathname = usePathname();
  const [state, setState] = useState<POAssistantState>(initialState);

  // ✅ NEW: Modal detection using MutationObserver
  useEffect(() => {
    const detectModals = () => {
      // Check for common modal selectors
      const modalSelectors = [
        '.fixed.inset-0', // Your modal backdrop
        '[role="dialog"]',
        '.modal',
        '.modal-backdrop',
        '.z-50', // High z-index elements
        '.z-\\[60\\]', // Escaped bracket z-index
        '.z-\\[9999\\]'
      ];
      
      const hasModal = modalSelectors.some(selector => {
        try {
          return document.querySelector(selector) !== null;
        } catch {
          return false;
        }
      });

      // Also check for backdrop elements
      const hasBackdrop = document.querySelector('.bg-black.bg-opacity-50') !== null;
      
      const isModalCurrentlyOpen = hasModal || hasBackdrop;
      
      setState(prev => {
        if (prev.isModalOpen !== isModalCurrentlyOpen) {
          console.log('🔍 PO Assistant: Modal state changed:', isModalCurrentlyOpen);
          return {
            ...prev,
            isModalOpen: isModalCurrentlyOpen,
            // ✅ Auto-minimize when modal opens
            isMinimized: isModalCurrentlyOpen ? true : prev.isMinimized
          };
        }
        return prev;
      });
    };

    // Initial check
    detectModals();

    // Set up observer for DOM changes
    const observer = new MutationObserver((mutations) => {
      // Check if any mutation affected modal elements
      const shouldCheck = mutations.some(mutation => {
        if (mutation.type === 'childList') {
          // Check added nodes
          const addedNodes = Array.from(mutation.addedNodes);
          return addedNodes.some(node => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const element = node as Element;
              return element.classList?.contains('fixed') || 
                     element.getAttribute('role') === 'dialog' ||
                     element.classList?.contains('modal');
            }
            return false;
          });
        }
        return false;
      });

      if (shouldCheck) {
        // Debounce the check
        setTimeout(detectModals, 100);
      }
    });

    // Observe document changes
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'role']
    });

    // Cleanup
    return () => {
      observer.disconnect();
    };
  }, []);

  // Auto-detect context from pathname
  useEffect(() => {
    let newContext: POAssistantState['currentContext'] = 'dashboard';
    let tripId: string | undefined;

    if (pathname.includes('/trips/new')) {
      newContext = 'trip_creation';
    } else if (pathname.includes('/diary')) {
      newContext = 'diary';
      const tripMatch = pathname.match(/\/trips\/([^/]+)\/diary/);
      tripId = tripMatch ? tripMatch[1] : undefined;
    } else if (pathname.includes('/trips/') && pathname.includes('/')) {
      // Check if it's a trip-specific page
      const tripMatch = pathname.match(/\/trips\/([^/]+)/);
      if (tripMatch && tripMatch[1] !== 'new') {
        newContext = 'diary';
        tripId = tripMatch[1];
      } else {
        newContext = 'trip_creation';
      }
    } else if (!user) {
      newContext = 'marketing';
    }

    setState(prev => ({
      ...prev,
      currentContext: newContext,
      currentTripId: tripId,
      showPreAuthNotice: !user && newContext === 'marketing'
    }));
  }, [pathname, user]);

  // Show PO automatically in certain contexts (but not when modal is open)
  useEffect(() => {
    const shouldAutoShow = 
      state.currentContext === 'marketing' || 
      state.currentContext === 'trip_creation';
    
    // ✅ UPDATED: Don't auto-show if modal is open
    if (shouldAutoShow && !state.isVisible && !state.isModalOpen) {
      setState(prev => ({ ...prev, isVisible: true }));
    }
  }, [state.currentContext, state.isVisible, state.isModalOpen]);

  const showPO = useCallback(() => {
    setState(prev => ({ 
      ...prev, 
      isVisible: true, 
      // ✅ UPDATED: Keep minimized if modal is open
      isMinimized: prev.isModalOpen ? true : false 
    }));
  }, []);

  const hidePO = useCallback(() => {
    setState(prev => ({ ...prev, isVisible: false }));
  }, []);

  const minimizePO = useCallback(() => {
    setState(prev => ({ ...prev, isMinimized: true }));
  }, []);

  const expandPO = useCallback(() => {
    // ✅ UPDATED: Don't expand if modal is open
    setState(prev => ({ 
      ...prev, 
      isMinimized: prev.isModalOpen ? true : false 
    }));
  }, []);

  const setContext = useCallback((context: POAssistantState['currentContext'], tripId?: string) => {
    setState(prev => ({
      ...prev,
      currentContext: context,
      currentTripId: tripId
    }));
  }, []); // 🔥 FIXED: Added useCallback to prevent infinite loop

  const togglePO = useCallback(() => {
    setState(prev => ({
      ...prev,
      isVisible: !prev.isVisible,
      // ✅ UPDATED: Handle modal state in toggle
      isMinimized: !prev.isVisible ? (prev.isModalOpen ? true : false) : true
    }));
  }, []);

  // ✅ NEW: Manual modal control function
  const setModalOpen = useCallback((isOpen: boolean) => {
    console.log('🎛️ PO Assistant: Manual modal state set to:', isOpen);
    setState(prev => ({
      ...prev,
      isModalOpen: isOpen,
      // Auto-minimize when modal opens
      isMinimized: isOpen ? true : prev.isMinimized
    }));
  }, []);

  const contextValue: POAssistantContextType = {
    state,
    showPO,
    hidePO,
    minimizePO,
    expandPO,
    setContext,
    togglePO,
    setModalOpen // ✅ NEW: Expose modal control
  };

  return (
    <POAssistantContext.Provider value={contextValue}>
      {children}
    </POAssistantContext.Provider>
  );
};

export const usePOAssistant = () => {
  const context = useContext(POAssistantContext);
  if (context === undefined) {
    throw new Error('usePOAssistant must be used within a POAssistantProvider');
  }
  return context;
};