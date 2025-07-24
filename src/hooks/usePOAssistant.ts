// src/hooks/usePOAssistant.ts
import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface TripContext {
  id: string;
  name: string;
  destination: string;
  startDate: string;
  endDate: string;
  companions: Array<{
    id: string;
    name: string;
    email?: string;
  }>;
  itinerary: Array<{
    id: string;
    day_number: number;
    title: string;
    activity_type: string;
    location?: string;
  }>;
  budget?: {
    total: number;
    spent: number;
    currency: string;
  };
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export const usePOAssistant = (tripId?: string) => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [tripContext, setTripContext] = useState<TripContext | null>(null);
  const [conversation, setConversation] = useState<ChatMessage[]>([]);

  // Load trip context when tripId changes
  useEffect(() => {
    if (tripId && user) {
      loadTripContext(tripId);
    }
  }, [tripId, user]);

  const loadTripContext = async (id: string) => {
    try {
      setIsLoading(true);
      
      // Fetch trip details, companions, and itinerary in parallel
      const [tripResponse, companionsResponse, itineraryResponse] = await Promise.all([
        fetch(`/api/trips/${id}`),
        fetch(`/api/trips/${id}/companions`),
        fetch(`/api/trips/${id}/itinerary`)
      ]);

      if (!tripResponse.ok) {
        throw new Error('Failed to fetch trip details');
      }

      const trip = await tripResponse.json();
      const companions = companionsResponse.ok ? await companionsResponse.json() : { companions: [] };
      const itinerary = itineraryResponse.ok ? await itineraryResponse.json() : { itinerary: [] };

      const context: TripContext = {
        id: trip.id,
        name: trip.name,
        destination: trip.destination,
        startDate: trip.start_date,
        endDate: trip.end_date,
        companions: companions.companions || [],
        itinerary: itinerary.itinerary || [],
        budget: trip.budget
      };

      setTripContext(context);
    } catch (error) {
      console.error('Error loading trip context:', error);
      // Set minimal context to prevent errors
      setTripContext(null);
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = useCallback(async (message: string) => {
    if (!user) return;

    setIsLoading(true);

    // Add user message to conversation
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: message,
      timestamp: new Date()
    };

    setConversation(prev => [...prev, userMessage]);

    try {
      // Prepare context for AI
      const contextPrompt = tripContext ? `
Current Trip Context:
- Trip Name: ${tripContext.name}
- Destination: ${tripContext.destination}
- Dates: ${tripContext.startDate} to ${tripContext.endDate}
- Companions: ${tripContext.companions.map(c => c.name).join(', ') || 'Solo trip'}
- Days planned: ${tripContext.itinerary.length}
- Budget: ${tripContext.budget ? `${tripContext.budget.total} ${tripContext.budget.currency}` : 'Not set'}

Recent Itinerary Items:
${tripContext.itinerary.slice(-5).map(item => 
  `Day ${item.day_number}: ${item.title} (${item.activity_type})`
).join('\n')}

Please provide helpful, trip-specific assistance based on this context.

User Question: ${message}
      ` : message;

      const response = await fetch('/api/po/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messages: [
            ...conversation.slice(-10), // Last 10 messages for context
            userMessage
          ],
          userId: user.id,
          tripId,
          context: tripId ? 'diary' : 'dashboard'
        })
      });

      const data = await response.json();

      if (data.message) {
        const assistantMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.message,
          timestamp: new Date()
        };

        setConversation(prev => [...prev, assistantMessage]);
      } else {
        throw new Error(data.error || 'Failed to get response');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Add error message
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again! 🐼',
        timestamp: new Date()
      };

      setConversation(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [user, tripContext, tripId, conversation]);

  const clearConversation = useCallback(() => {
    setConversation([]);
  }, []);

  return {
    conversation,
    tripContext,
    isLoading,
    sendMessage,
    clearConversation
  };
};
