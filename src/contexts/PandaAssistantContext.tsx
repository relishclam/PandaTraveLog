'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type Emotion = 'happy' | 'thinking' | 'excited' | 'confused' | 'sad' | 'love' | 'surprised' | 'curious';

export type ModalAction = {
  text: string;
  onClick: () => void;
  style?: 'primary' | 'secondary' | 'danger';
};

export type PandaModalConfig = {
  isOpen: boolean;
  title?: string;
  message: string;
  emotion?: Emotion;
  primaryAction?: ModalAction;
  secondaryAction?: ModalAction;
  onClose?: () => void; // Callback for when the modal is dismissed/closed
  content?: React.ReactNode; // Added to support custom React content in modal
};

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
  modal: PandaModalConfig; // Added modal state
};

type PandaAssistantContextType = {
  state: PandaAssistantState;
  showMainAssistant: (message?: string, emotion?: Emotion) => void;
  hideMainAssistant: () => void;
  showFloatingAssistant: (message?: string, emotion?: Emotion) => void;
  hideFloatingAssistant: () => void;
  hideAllAssistants: () => void;
  showPandaModal: (config: Omit<PandaModalConfig, 'isOpen'>) => void; // Function to show a modal
  hidePandaModal: () => void; // Function to hide the modal
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
  modal: { // Initial modal state
    isOpen: false,
    message: '',
    emotion: 'happy', // Default emotion for modal if not specified
    content: null, // Initialize content as null
    // title, primaryAction, secondaryAction, onClose will be undefined initially
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
          const parsedState = JSON.parse(savedState);
          // Ensure modal state is initialized if not present in savedState
          setState({
            ...initialState, // Start with defaults
            ...parsedState,  // Override with saved values
            // Ensure modal is always defined, merging with initial if not fully present
            modal: { ...initialState.modal, ...(parsedState.modal || {}) }
          });
        } catch (error) {
          console.error('Failed to parse saved panda assistant state', error);
          setState(initialState); // Fallback to initial state on error
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

  const showPandaModal = (config: Omit<PandaModalConfig, 'isOpen'>) => {
    setState(prev => ({
      ...prev,
      modal: {
        ...config,
        isOpen: true,
        emotion: config.emotion || prev.modal.emotion || 'happy', // Use provided, existing, or default emotion
      }
    }));
  };

  const hidePandaModal = () => {
    const currentOnClose = state.modal.onClose;

    setState(prev => ({
      ...prev,
      modal: { ...initialState.modal } // Reset to initial (closed) modal state
    }));

    if (currentOnClose) {
      currentOnClose();
    }
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
        showPandaModal,   // Expose new modal function
        hidePandaModal    // Expose new modal function
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
