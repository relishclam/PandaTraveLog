'use client';

import React, { createContext, useContext, useReducer, useCallback } from 'react';

// Trip Creation State Types
export interface TripCreationState {
  // Step 1: Basic Trip Info
  tripName: string;
  startDate: string;
  endDate: string;
  budget?: number;
  
  // Step 2: Destinations (AI-enhanced)
  destinations: Array<{
    id: string;
    name: string;
    address?: string;
    coordinates?: { lat: number; lng: number };
    country?: string;
    currency?: any;
    keyAttractions?: string[];
    estimatedDailyBudget?: any;
    reasoning?: string;
    suggestedActivities?: string[];
    weatherInfo?: any;
    currencyInfo?: any;
  }>;
  
  // Step 3: Daily Schedule (AI-generated)
  daySchedules: Array<{
    id: string;
    day: number;
    date: string;
    activities: string;
    aiSuggestions?: string[];
    notes?: string;
  }>;
  
  // Step 4: Travel Details (AI-optimized)
  travelDetails: Array<{
    id: string;
    mode: 'flight' | 'train' | 'car' | 'bus';
    details: string;
    aiOptimizations?: string[];
    departureTime?: string;
    arrivalTime?: string;
  }>;
  
  // Step 5: Accommodations (AI-recommended)
  accommodations: Array<{
    id: string;
    name: string;
    checkIn: string;
    checkOut: string;
    aiRecommendations?: string[];
    priceEstimate?: number;
    confirmationNumber?: string;
    contactInfo?: string;
    notes?: string;
  }>;
  
  // AI Context & Metadata
  aiContext: {
    travelPreferences?: string[];
    budgetRange?: string;
    travelStyle?: 'budget' | 'mid-range' | 'luxury';
    interests?: string[];
    previousSuggestions?: any[];
  };
  
  // Current Step & Loading States
  currentStep: number;
  isLoading: boolean;
  error: string | null;
}

// Action Types
type TripCreationAction =
  | { type: 'SET_BASIC_INFO'; payload: { tripName: string; startDate: string; endDate: string; budget?: number } }
  | { type: 'ADD_DESTINATION'; payload: any }
  | { type: 'UPDATE_DESTINATION'; payload: { id: string; updates: any } }
  | { type: 'REMOVE_DESTINATION'; payload: string }
  | { type: 'ADD_DAY_SCHEDULE'; payload: any }
  | { type: 'UPDATE_DAY_SCHEDULE'; payload: { id: string; updates: any } }
  | { type: 'SET_AI_SUGGESTIONS'; payload: { type: string; suggestions: any } }
  | { type: 'SET_STEP'; payload: number }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'RESET_TRIP' };

// Initial State
const initialState: TripCreationState = {
  tripName: '',
  startDate: '',
  endDate: '',
  destinations: [],
  daySchedules: [],
  travelDetails: [],
  accommodations: [],
  aiContext: {},
  currentStep: 1,
  isLoading: false,
  error: null,
};

// Reducer
function tripCreationReducer(state: TripCreationState, action: TripCreationAction): TripCreationState {
  switch (action.type) {
    case 'SET_BASIC_INFO':
      return {
        ...state,
        ...action.payload,
        // Auto-generate day schedules based on date range
        daySchedules: generateDaySchedules(action.payload.startDate, action.payload.endDate),
      };
    
    case 'ADD_DESTINATION':
      return {
        ...state,
        destinations: [...state.destinations, action.payload],
      };
    
    case 'UPDATE_DESTINATION':
      return {
        ...state,
        destinations: state.destinations.map(dest =>
          dest.id === action.payload.id ? { ...dest, ...action.payload.updates } : dest
        ),
      };
    
    case 'REMOVE_DESTINATION':
      return {
        ...state,
        destinations: state.destinations.filter(dest => dest.id !== action.payload),
      };
    
    case 'ADD_DAY_SCHEDULE':
      return {
        ...state,
        daySchedules: [...state.daySchedules, action.payload],
      };
    
    case 'UPDATE_DAY_SCHEDULE':
      return {
        ...state,
        daySchedules: state.daySchedules.map(schedule =>
          schedule.id === action.payload.id ? { ...schedule, ...action.payload.updates } : schedule
        ),
      };
    
    case 'SET_AI_SUGGESTIONS':
      return {
        ...state,
        aiContext: {
          ...state.aiContext,
          previousSuggestions: [
            ...(state.aiContext.previousSuggestions || []),
            { type: action.payload.type, suggestions: action.payload.suggestions, timestamp: Date.now() }
          ],
        },
      };
    
    case 'SET_STEP':
      return { ...state, currentStep: action.payload };
    
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    
    case 'RESET_TRIP':
      return initialState;
    
    default:
      return state;
  }
}

// Helper function to generate day schedules from date range
function generateDaySchedules(startDate: string, endDate: string) {
  const schedules = [];
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

  for (let i = 0; i < diffDays; i++) {
    const currentDate = new Date(start);
    currentDate.setDate(start.getDate() + i);
    
    schedules.push({
      id: `day-${i + 1}`,
      day: i + 1,
      date: currentDate.toISOString().split('T')[0],
      activities: '',
      aiSuggestions: [],
      notes: '',
    });
  }

  return schedules;
}

// Context Type
interface TripCreationContextType {
  state: TripCreationState;
  
  // Basic Actions
  setBasicInfo: (info: { tripName: string; startDate: string; endDate: string; budget?: number }) => void;
  addDestination: (destination: any) => void;
  updateDestination: (id: string, updates: any) => void;
  removeDestination: (id: string) => void;
  updateDaySchedule: (id: string, updates: any) => void;
  setStep: (step: number) => void;
  resetTrip: () => void;
  
  // AI-Enhanced Actions
  generateAIDestinationSuggestions: (query: string) => Promise<any[]>;
  generateAIActivitySuggestions: (destinationName: string, date: string) => Promise<string[]>;
  generateAITravelOptimizations: (destinations: any[]) => Promise<any[]>;
  generateAIAccommodationRecommendations: (destination: string, checkIn: string, checkOut: string) => Promise<any[]>;
  
  // Utility Actions
  getLocationDetails: (placeName: string) => Promise<any>;
  getCurrencyInfo: (country: string) => Promise<any>;
  getWeatherInfo: (location: string, date: string) => Promise<any>;
}

// Create Context
const TripCreationContext = createContext<TripCreationContextType | undefined>(undefined);

// Hook
export const useTripCreation = () => {
  const context = useContext(TripCreationContext);
  if (context === undefined) {
    throw new Error('useTripCreation must be used within a TripCreationProvider');
  }
  return context;
};

// Provider Component
export const TripCreationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(tripCreationReducer, initialState);

  // Basic Actions
  const setBasicInfo = useCallback((info: { tripName: string; startDate: string; endDate: string; budget?: number }) => {
    dispatch({ type: 'SET_BASIC_INFO', payload: info });
  }, []);

  const addDestination = useCallback((destination: any) => {
    dispatch({ type: 'ADD_DESTINATION', payload: destination });
  }, []);

  const updateDestination = useCallback((id: string, updates: any) => {
    dispatch({ type: 'UPDATE_DESTINATION', payload: { id, updates } });
  }, []);

  const removeDestination = useCallback((id: string) => {
    dispatch({ type: 'REMOVE_DESTINATION', payload: id });
  }, []);

  const updateDaySchedule = useCallback((id: string, updates: any) => {
    dispatch({ type: 'UPDATE_DAY_SCHEDULE', payload: { id, updates } });
  }, []);

  const setStep = useCallback((step: number) => {
    dispatch({ type: 'SET_STEP', payload: step });
  }, []);

  const resetTrip = useCallback(() => {
    dispatch({ type: 'RESET_TRIP' });
  }, []);

  // AI-Enhanced Actions
  const generateAIDestinationSuggestions = useCallback(async (query: string) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const response = await fetch('/api/ai/destination-suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          query, 
          context: {
            tripName: state.tripName,
            startDate: state.startDate,
            endDate: state.endDate,
            budget: state.aiContext.budgetRange,
            interests: state.aiContext.interests,
          }
        }),
      });
      
      if (!response.ok) throw new Error('Failed to get AI suggestions');
      
      const suggestions = await response.json();
      dispatch({ type: 'SET_AI_SUGGESTIONS', payload: { type: 'destinations', suggestions } });
      return suggestions;
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'AI suggestion failed' });
      return [];
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [state.tripName, state.startDate, state.endDate, state.aiContext]);

  const generateAIActivitySuggestions = useCallback(async (destinationName: string, date: string) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const response = await fetch('/api/ai/activity-suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          destination: destinationName,
          date,
          context: {
            tripName: state.tripName,
            dayNumber: state.daySchedules.findIndex(d => d.date === date) + 1,
            totalDays: state.daySchedules.length,
            interests: state.aiContext.interests,
            budget: state.aiContext.budgetRange,
          }
        }),
      });
      
      if (!response.ok) throw new Error('Failed to get activity suggestions');
      
      const suggestions = await response.json();
      dispatch({ type: 'SET_AI_SUGGESTIONS', payload: { type: 'activities', suggestions } });
      return suggestions.activities || [];
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Activity suggestion failed' });
      return [];
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [state.tripName, state.daySchedules, state.aiContext]);

  const generateAITravelOptimizations = useCallback(async (destinations: any[]) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const response = await fetch('/api/ai/travel-optimizations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          destinations,
          context: {
            startDate: state.startDate,
            endDate: state.endDate,
            budget: state.aiContext.budgetRange,
          }
        }),
      });
      
      if (!response.ok) throw new Error('Failed to get travel optimizations');
      
      const optimizations = await response.json();
      dispatch({ type: 'SET_AI_SUGGESTIONS', payload: { type: 'travel', suggestions: optimizations } });
      return optimizations;
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Travel optimization failed' });
      return [];
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [state.startDate, state.endDate, state.aiContext]);

  const generateAIAccommodationRecommendations = useCallback(async (destination: string, checkIn: string, checkOut: string) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const response = await fetch('/api/ai/accommodation-recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          destination,
          checkIn,
          checkOut,
          context: {
            budget: state.aiContext.budgetRange,
            travelStyle: state.aiContext.travelStyle,
            interests: state.aiContext.interests,
          }
        }),
      });
      
      if (!response.ok) throw new Error('Failed to get accommodation recommendations');
      
      const recommendations = await response.json();
      dispatch({ type: 'SET_AI_SUGGESTIONS', payload: { type: 'accommodations', suggestions: recommendations } });
      return recommendations;
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Accommodation recommendation failed' });
      return [];
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [state.aiContext]);

  // Utility Actions using existing APIs
  const getLocationDetails = useCallback(async (placeName: string) => {
    try {
      const response = await fetch(`/api/po/location-currency?location=${encodeURIComponent(placeName)}`);
      if (!response.ok) throw new Error('Failed to get location details');
      return await response.json();
    } catch (error) {
      console.error('Location details error:', error);
      return null;
    }
  }, []);

  const getCurrencyInfo = useCallback(async (country: string) => {
    try {
      const response = await fetch(`/api/po/location-currency?location=${encodeURIComponent(country)}`);
      if (!response.ok) throw new Error('Failed to get currency info');
      const data = await response.json();
      return data.currency;
    } catch (error) {
      console.error('Currency info error:', error);
      return null;
    }
  }, []);

  const getWeatherInfo = useCallback(async (location: string, date: string) => {
    // This would integrate with a weather API - placeholder for now
    try {
      // TODO: Implement weather API integration
      return { location, date, forecast: 'Weather data not available yet' };
    } catch (error) {
      console.error('Weather info error:', error);
      return null;
    }
  }, []);

  const value: TripCreationContextType = {
    state,
    setBasicInfo,
    addDestination,
    updateDestination,
    removeDestination,
    updateDaySchedule,
    setStep,
    resetTrip,
    generateAIDestinationSuggestions,
    generateAIActivitySuggestions,
    generateAITravelOptimizations,
    generateAIAccommodationRecommendations,
    getLocationDetails,
    getCurrencyInfo,
    getWeatherInfo,
  };

  return (
    <TripCreationContext.Provider value={value}>
      {children}
    </TripCreationContext.Provider>
  );
};
