'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Emotion = 'happy' | 'thinking' | 'excited' | 'confused' | 'sad';

type PandaAssistantState = {
  mainAssistant: {
    visible: boolean;
    message: string | null;
    emotion: Emotion;
  };
  floatingAssistant: {
    visible: boolean;
    message: string | null;
    emotion: Emotion;
  };
};

type PandaAssistantContextType = {
  state: PandaAssistantState;
  showMainAssistant: (message?: string, emotion?: Emotion) => void;
  hideMainAssistant: () => void;
  showFloatingAssistant: (message?: string, emotion?: Emotion) => void;
  hideFloatingAssistant: () => void;
  hideAllAssistants: () => void;
};

const initialState: PandaAssistantState = {
  mainAssistant: {
    visible: true,
    message: null,
    emotion: 'happy',
  },
  floatingAssistant: {
    visible: false,
    message: null,
    emotion: 'happy',
  },
};

const PandaAssistantContext = createContext<PandaAssistantContextType | undefined>(undefined);

export const PandaAssistantProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useState<PandaAssistantState>(initialState);

  // Load state from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedState = localStorage.getItem('pandaAssistantContextState');
      if (savedState) {
        try {
          setState(JSON.parse(savedState));
        } catch (error) {
          console.error('Failed to parse saved panda assistant state', error);
        }
      }
    }
  }, []);

  // Save state to localStorage when it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('pandaAssistantContextState', JSON.stringify(state));
    }
  }, [state]);

  const showMainAssistant = (message?: string, emotion: Emotion = 'happy') => {
    setState(prev => ({
      ...prev,
      mainAssistant: {
        visible: true,
        message: message || prev.mainAssistant.message,
        emotion: emotion,
      }
    }));
  };

  const hideMainAssistant = () => {
    setState(prev => ({
      ...prev,
      mainAssistant: {
        ...prev.mainAssistant,
        visible: false,
      }
    }));
  };

  const showFloatingAssistant = (message?: string, emotion: Emotion = 'happy') => {
    setState(prev => ({
      ...prev,
      floatingAssistant: {
        visible: true,
        message: message || prev.floatingAssistant.message,
        emotion: emotion,
      }
    }));
  };

  const hideFloatingAssistant = () => {
    setState(prev => ({
      ...prev,
      floatingAssistant: {
        ...prev.floatingAssistant,
        visible: false,
      }
    }));
  };

  const hideAllAssistants = () => {
    setState(prev => ({
      ...prev,
      mainAssistant: {
        ...prev.mainAssistant,
        visible: false,
      },
      floatingAssistant: {
        ...prev.floatingAssistant,
        visible: false,
      }
    }));
  };

  return (
    <PandaAssistantContext.Provider
      value={{
        state,
        showMainAssistant,
        hideMainAssistant,
        showFloatingAssistant,
        hideFloatingAssistant,
        hideAllAssistants,
      }}
    >
      {children}
    </PandaAssistantContext.Provider>
  );
};

export const usePandaAssistant = () => {
  const context = useContext(PandaAssistantContext);
  if (context === undefined) {
    throw new Error('usePandaAssistant must be used within a PandaAssistantProvider');
  }
  return context;
};
