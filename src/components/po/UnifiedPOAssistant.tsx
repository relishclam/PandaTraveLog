'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { IoClose, IoSend, IoContract, IoExpand } from 'react-icons/io5';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, usePathname } from 'next/navigation';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface POAssistantProps {
  tripId?: string;
  context?: 'marketing' | 'trip_creation' | 'diary' | 'manual_entry' | 'dashboard';
  isMinimized?: boolean;
  onMinimize?: () => void;
  onTripCreated?: (tripId: string) => void;
  className?: string;
}

export default function UnifiedPOAssistant({
  tripId,
  context = 'dashboard',
  isMinimized = false,
  onMinimize,
  onTripCreated,
  className = ''
}: POAssistantProps) {
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [showPreAuthNotice, setShowPreAuthNotice] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [inputFocused, setInputFocused] = useState(false);

  // Auto-detect context from pathname
  const getContextFromPath = useCallback(() => {
    if (pathname.includes('/trips/new')) return 'trip_creation';
    if (pathname.includes('/diary')) return 'diary';
    if (pathname.includes('/trips/') && !user) return 'marketing';
    if (pathname.includes('/trips/')) return 'trip_creation';
    return context;
  }, [pathname, context, user]);

  const currentContext = getContextFromPath();

  // Load conversation history on mount
  useEffect(() => {
    if (user && tripId) {
      loadConversationHistory();
    } else if (!user && currentContext === 'marketing') {
      // Show initial marketing message
      setMessages([{
        role: 'assistant',
        content: `Hi there! I'm PO, your friendly travel assistant! 🐼✈️

I can help you plan amazing trips, suggest destinations, find accommodations, and create detailed itineraries. 

*Note: Since you're not signed in, our conversation won't be saved. Sign up to keep our chat history and unlock personalized trip planning!*

Where would you like to go?`,
        timestamp: new Date()
      }]);
      setShowPreAuthNotice(true);
    }
  }, [user, tripId, currentContext]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadConversationHistory = async () => {
    if (!user || !tripId) return;

    try {
      const response = await fetch(`/api/po/conversations?tripId=${tripId}`, {
        headers: {
          'Authorization': `Bearer ${user.id}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.conversation) {
          setMessages(data.conversation.messages || []);
          setConversationId(data.conversation.id);
        } else {
          // Initialize with context-aware greeting
          const greeting = getContextualGreeting();
          setMessages([{
            role: 'assistant',
            content: greeting,
            timestamp: new Date()
          }]);
        }
      }
    } catch (error) {
      console.error('Error loading conversation:', error);
      // Fallback to contextual greeting
      const greeting = getContextualGreeting();
      setMessages([{
        role: 'assistant',
        content: greeting,
        timestamp: new Date()
      }]);
    }
  };

  const getContextualGreeting = () => {
    const greetings = {
      marketing: `Hi! I'm PO, your travel planning buddy! 🐼✈️ Let's plan an amazing trip together!`,
      trip_creation: `Hey there! Ready to plan an awesome trip? I'm PO, and I'll help you create the perfect itinerary! 🌟`,
      diary: `Welcome back! I'm here to help you with any questions about your trip. Need suggestions for activities, restaurants, or places to visit? 🗺️`,
      manual_entry: `Hi! I'm PO, your travel assistant. I can help you find great places to visit, restaurants to try, and accommodations to book! 🏨✈️`,
      dashboard: `Hello! I'm PO, your personal travel assistant. Ready to plan your next adventure? 🐼🌍`
    };
    
    return greetings[currentContext] || greetings.dashboard;
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: Message = {
      role: 'user',
      content: inputMessage.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/po/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [...messages, userMessage],
          userId: user?.id,
          tripId: tripId,
          context: currentContext,
          conversationId: conversationId
        })
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      
      const assistantMessage: Message = {
        role: 'assistant',
        content: data.message,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
      
      // Update conversation ID if returned
      if (data.conversationId) {
        setConversationId(data.conversationId);
      }

      // Handle trip creation
      if (data.tripData && onTripCreated) {
        // Show trip creation confirmation
        const confirmMessage: Message = {
          role: 'assistant',
          content: `Perfect! I've created your trip: "${data.tripData.title}". Would you like me to add this to your Trip Diary?`,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, confirmMessage]);
        
        // Create trip and redirect
        const tripResponse = await fetch('/api/trips/create-ai-trip', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            tripData: data.tripData,
            userId: user?.id,
            conversationId: conversationId
          })
        });

        if (tripResponse.ok) {
          const tripResult = await tripResponse.json();
          onTripCreated(tripResult.tripId);
        }
      }

    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: Message = {
        role: 'assistant',
        content: "I'm having trouble responding right now. Please try again in a moment! 🤔",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Maintain input focus after state updates
  useEffect(() => {
    if (inputFocused && inputRef.current && !isLoading) {
      const timeoutId = setTimeout(() => {
        inputRef.current?.focus();
      }, 0);
      return () => clearTimeout(timeoutId);
    }
  }, [inputMessage, inputFocused, isLoading]);

  // Chat Interface Component
  const ChatInterface = () => (
    <>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-orange-50">
        <div className="flex items-center space-x-3">
          <Image
            src={isLoading ? "/images/po/emotions/thinking.png" : "/images/po/emotions/excited.png"}
            alt="PO"
            width={40}
            height={40}
            className="rounded-full"
            unoptimized
          />
          <div>
            <h3 className="font-semibold text-gray-900">PO Assistant</h3>
            <p className="text-sm text-gray-600">Your Travel Buddy</p>
          </div>
        </div>
        <div className="flex space-x-2">
          {onMinimize && (
            <button
              onClick={onMinimize}
              className="p-2 hover:bg-gray-100 rounded-full"
            >
              <IoContract className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => setIsOpen(false)}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <IoClose className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {showPreAuthNotice && !user && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
            <p className="text-sm text-yellow-800">
              💡 <strong>Sign up to save our conversation!</strong> Your chat history will be preserved across all your trips.
            </p>
          </div>
        )}
        
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] p-3 rounded-lg ${
                message.role === 'user'
                  ? 'bg-orange-500 text-white'
                  : 'bg-gray-100 text-gray-900'
              }`}
            >
              <p className="whitespace-pre-wrap">{message.content}</p>
              <p className="text-xs opacity-70 mt-1">
                {message.timestamp.toLocaleTimeString()}
              </p>
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 p-3 rounded-lg">
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
      <div className="p-4 border-t border-gray-200">
        <div className="flex space-x-2">
          <input
            ref={inputRef}
            type="text"
            value={inputMessage}
            onChange={(e) => {
              e.preventDefault();
              setInputMessage(e.target.value);
            }}
            onKeyDown={handleKeyPress}
            onFocus={() => setInputFocused(true)}
            onBlur={() => setInputFocused(false)}
            placeholder="Ask PO anything about your trip..."
            className="flex-1 p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            disabled={isLoading}
            autoComplete="off"
          />
          <button
            onClick={sendMessage}
            disabled={isLoading || !inputMessage.trim()}
            className="p-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <IoSend className="w-4 h-4" />
          </button>
        </div>
      </div>
    </>
  );

  // Floating PO icon when minimized
  if (isMinimized) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <button
          onClick={() => setIsOpen(true)}
          className="bg-orange-500 hover:bg-orange-600 rounded-full p-3 shadow-lg transition-transform hover:scale-110 active:scale-95"
        >
          <Image
            src="/images/po/emotions/excited.png"
            alt="PO Assistant"
            width={60}
            height={60}
            className="rounded-full"
            unoptimized
          />
        </button>
        
        {/* Chat Modal */}
        <AnimatePresence>
          {isOpen && (
            <div className="absolute bottom-20 right-0 w-96 h-[500px] bg-white rounded-lg shadow-2xl border border-gray-200 flex flex-col">
              <ChatInterface />
            </div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // Full-screen or embedded chat interface
  return (
    <div className={`${className} ${isMinimized ? '' : 'h-full flex flex-col'}`}>
      <ChatInterface />
    </div>
  );
}
