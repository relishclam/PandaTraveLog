'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { IoSend, IoClose, IoMic, IoMicOff } from 'react-icons/io5';
import { usePandaAssistant, Emotion } from '@/contexts/PandaAssistantContext';
import { useAuth } from '@/contexts/AuthContext';

interface ChatMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  emotion?: Emotion;
  suggestedActions?: Array<{text: string, action: string}>;
}

interface PandaAIChatProps {
  isOpen: boolean;
  onClose: () => void;
  context?: string;
  tripId?: string;
  initialMessage?: string;
}

export const PandaAIChat: React.FC<PandaAIChatProps> = ({
  isOpen,
  onClose,
  context = 'general',
  tripId,
  initialMessage
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [conversationLoaded, setConversationLoaded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const { showFloatingAssistant } = usePandaAssistant();
  const { user } = useAuth();

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Load conversation history when chat opens
  useEffect(() => {
    if (isOpen && !conversationLoaded && user?.id) {
      loadConversationHistory();
    }
  }, [isOpen, conversationLoaded, user?.id, context]);

  const loadConversationHistory = async () => {
    try {
      // For now, we'll start fresh each time but send history to API
      // In the future, we could load from localStorage or API
      const welcomeMessage = initialMessage || getWelcomeMessage(context);
      setMessages([{
        id: Date.now().toString(),
        type: 'assistant',
        content: welcomeMessage,
        timestamp: new Date(),
        emotion: 'happy',
        suggestedActions: getInitialSuggestions(context)
      }]);
      setConversationLoaded(true);
    } catch (error) {
      console.error('Error loading conversation history:', error);
      // Fallback to welcome message
      const welcomeMessage = initialMessage || getWelcomeMessage(context);
      setMessages([{
        id: Date.now().toString(),
        type: 'assistant',
        content: welcomeMessage,
        timestamp: new Date(),
        emotion: 'happy',
        suggestedActions: getInitialSuggestions(context)
      }]);
      setConversationLoaded(true);
    }
  };

  const getWelcomeMessage = (context: string): string => {
    switch (context) {
      case 'trip_creation':
        return "Hi there! 🐼 I'm PO, your travel assistant! I see you're creating a new trip. I can help you plan destinations, set dates, and organize your itinerary. What would you like to work on first?";
      case 'trip_diary':
        return "Welcome to your trip diary! 🗓️ I can help you organize your daily schedule, add activities, or suggest improvements to your itinerary. How can I assist you today?";
      case 'dashboard':
        return "Hello, fellow traveler! 🌍 Ready to plan your next adventure? I can help you create new trips, manage existing ones, or answer any travel questions you have!";
      default:
        return "Hi! I'm PO, your friendly travel panda! 🐼 I'm here to help with all your travel planning needs. What can I do for you today?";
    }
  };

  const getInitialSuggestions = (context: string): Array<{text: string, action: string}> => {
    switch (context) {
      case 'trip_creation':
        return [
          { text: 'Help with destinations', action: 'destinations' },
          { text: 'Set travel dates', action: 'dates' },
          { text: 'Plan activities', action: 'activities' }
        ];
      case 'trip_diary':
        return [
          { text: 'Edit daily schedule', action: 'schedule' },
          { text: 'Add new activities', action: 'activities' },
          { text: 'Travel tips', action: 'tips' }
        ];
      default:
        return [
          { text: 'Create new trip', action: 'create' },
          { text: 'Travel advice', action: 'advice' },
          { text: 'App help', action: 'help' }
        ];
    }
  };

  const sendMessage = async (messageText?: string) => {
    const textToSend = messageText || inputMessage.trim();
    if (!textToSend || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: textToSend,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      // Convert messages to API format for conversation history
      const conversationHistory = messages.map(msg => ({
        role: msg.type === 'user' ? 'user' : 'assistant',
        content: msg.content,
        timestamp: msg.timestamp.toISOString()
      }));

      const response = await fetch('/api/assistant/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: textToSend,
          context,
          tripId,
          userId: user?.id,
          conversationHistory
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response from PO Assistant');
      }

      const data = await response.json();

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: data.message,
        timestamp: new Date(),
        emotion: data.emotion || 'happy',
        suggestedActions: data.suggestedActions || []
      };

      setMessages(prev => [...prev, assistantMessage]);
      
      // Log conversation context for debugging
      console.log('Conversation updated:', {
        totalMessages: messages.length + 2, // +2 for user and assistant messages just added
        context,
        tripId,
        lastMessage: textToSend
      });

      // Update floating assistant with the emotion
      showFloatingAssistant(undefined, data.emotion || 'happy');

    } catch (error) {
      console.error('Error sending message to PO Assistant:', error);
      
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: "Oops! 😅 I'm having trouble connecting right now. Please try again in a moment!",
        timestamp: new Date(),
        emotion: 'confused'
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestedAction = (action: string) => {
    const actionMessages: Record<string, string> = {
      'destinations': 'Help me find good destinations for my trip',
      'dates': 'Help me choose the best travel dates',
      'activities': 'Suggest activities for my destination',
      'schedule': 'Help me organize my daily schedule',
      'tips': 'Give me travel tips for my destination',
      'create': 'How do I create a new trip?',
      'advice': 'Give me general travel advice',
      'help': 'How do I use this app?'
    };

    const message = actionMessages[action] || `Help me with ${action}`;
    sendMessage(message);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="animate-in zoom-in-95 duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md h-[600px] mx-4 flex flex-col overflow-hidden border-2 border-orange-500">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white p-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
              <span className="text-2xl">🐼</span>
            </div>
            <div>
              <h3 className="font-bold text-lg">PO Assistant</h3>
              <p className="text-orange-100 text-sm">Your Travel Companion</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:text-orange-200 transition-colors"
            aria-label="Close chat"
          >
            <IoClose size={24} />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <AnimatePresence>
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-4 duration-300`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                    message.type === 'user'
                      ? 'bg-orange-500 text-white'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  
                  {/* Suggested Actions */}
                  {message.type === 'assistant' && message.suggestedActions && message.suggestedActions.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {message.suggestedActions.map((action, index) => (
                        <button
                          key={index}
                          onClick={() => handleSuggestedAction(action.action)}
                          className="bg-orange-500 text-white text-xs px-3 py-1 rounded-full hover:bg-orange-600 transition-colors"
                        >
                          {action.text}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </AnimatePresence>
          
          {/* Loading indicator */}
          {isLoading && (
            <div className="flex justify-start animate-in fade-in duration-200">
              <div className="bg-gray-100 rounded-2xl px-4 py-2">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="border-t border-gray-200 p-4">
          <div className="flex items-center space-x-2">
            <input
              ref={inputRef}
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask PO anything..."
              className="flex-1 border border-gray-300 rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              disabled={isLoading}
            />
            <button
              onClick={() => sendMessage()}
              disabled={!inputMessage.trim() || isLoading}
              className="bg-orange-500 text-white p-2 rounded-full hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Send message"
            >
              <IoSend size={20} />
            </button>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
};
