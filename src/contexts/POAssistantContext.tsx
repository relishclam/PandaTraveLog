'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { usePathname } from 'next/navigation';

interface POAssistantState {
  isVisible: boolean;
  isMinimized: boolean;
  currentContext: 'marketing' | 'trip_creation' | 'diary' | 'manual_entry' | 'dashboard';
  currentTripId?: string;
  showPreAuthNotice: boolean;
}

interface POAssistantContextType {
  state: POAssistantState;
  showPO: () => void;
  hidePO: () => void;
  minimizePO: () => void;
  expandPO: () => void;
  setContext: (context: POAssistantState['currentContext'], tripId?: string) => void;
  togglePO: () => void;
}

const initialState: POAssistantState = {
  isVisible: false,
  isMinimized: true,
  currentContext: 'dashboard',
  currentTripId: undefined,
  showPreAuthNotice: false
};

const POAssistantContext = createContext<POAssistantContextType | undefined>(undefined);

export const POAssistantProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const pathname = usePathname();
  const [state, setState] = useState<POAssistantState>(initialState);

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

  // Show PO automatically in certain contexts
  useEffect(() => {
    const shouldAutoShow = 
      state.currentContext === 'marketing' || 
      state.currentContext === 'trip_creation';
    
    if (shouldAutoShow && !state.isVisible) {
      setState(prev => ({ ...prev, isVisible: true }));
    }
  }, [state.currentContext, state.isVisible]);

  const showPO = () => {
    setState(prev => ({ ...prev, isVisible: true, isMinimized: false }));
  };

  const hidePO = () => {
    setState(prev => ({ ...prev, isVisible: false }));
  };

  const minimizePO = () => {
    setState(prev => ({ ...prev, isMinimized: true }));
  };

  const expandPO = () => {
    setState(prev => ({ ...prev, isMinimized: false }));
  };

  const setContext = (context: POAssistantState['currentContext'], tripId?: string) => {
    setState(prev => ({
      ...prev,
      currentContext: context,
      currentTripId: tripId
    }));
  };

  const togglePO = () => {
    setState(prev => ({
      ...prev,
      isVisible: !prev.isVisible,
      isMinimized: prev.isVisible ? true : false
    }));
  };

  const contextValue: POAssistantContextType = {
    state,
    showPO,
    hidePO,
    minimizePO,
    expandPO,
    setContext,
    togglePO
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
