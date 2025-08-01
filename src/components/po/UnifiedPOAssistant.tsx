'use client';

import React, { useState, useEffect, useRef, useCallback, memo, useMemo } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { X as IoClose, Send as IoSend, Minimize as IoContract, Maximize as IoExpand } from 'lucide-react';
import { Sparkles, MapPin, DollarSign } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { AIDiaryAdoptionModal } from './AIDiaryAdoptionModal';
import { LocationCurrencyWidget } from './LocationCurrencyWidget';
import { useLocationFeatures, useCurrencyConverter } from '@/hooks/useLocationCurrency';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { SearchResultCard } from './SearchResultCard';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  diaryWriteData?: any; // To hold suggestions for the diary
  searchResults?: any[]; // To hold semantic search results
}

interface POAssistantProps {
  tripId?: string;
  context?: 'marketing' | 'trip_creation' | 'diary' | 'manual_entry' | 'dashboard' | 'trip_enhancement' | 'trip_planning';
  isMinimized?: boolean;
  onMinimize?: () => void;
  onTripCreated?: (tripId: string) => void;
  className?: string;
}

function UnifiedPOAssistant({
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
  const { userLocation, getLocationString } = useLocationFeatures();
  const { preferredCurrency } = useCurrencyConverter();
  
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [showPreAuthNotice, setShowPreAuthNotice] = useState(false);
  const [showAIDiaryModal, setShowAIDiaryModal] = useState(false);
  const [canGenerateDiary, setCanGenerateDiary] = useState(false);
  const [processedDiaryWrites, setProcessedDiaryWrites] = useState(new Set<number>());
  const [isWritingToDiary, setIsWritingToDiary] = useState<number | null>(null);
  const [showLocationWidget, setShowLocationWidget] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [inputFocused, setInputFocused] = useState(false);

  // Optimized input handler with auto-resize support
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputMessage(e.target.value);
    
    // Auto-resize logic
    const textarea = e.target;
    const maxHeight = 120; // max height in pixels
    
    // Reset height to auto to get proper scrollHeight
    textarea.style.height = 'auto';
    
    // Calculate new height
    const newHeight = Math.min(textarea.scrollHeight, maxHeight);
    textarea.style.height = `${newHeight}px`;
  }, []);

  // Memoize messages to prevent unnecessary re-renders
  const memoizedMessages = useMemo(() => messages, [messages]);

  // Auto-detect context from pathname
  const getContextFromPath = useCallback(() => {
    if (!pathname) return context; // Handle null pathname
    if (pathname.includes('/trips/new')) return 'trip_creation';
    if (pathname.includes('/diary')) return 'diary';
    if (pathname.includes('/trips/') && !user) return 'marketing';
    if (pathname.includes('/trips/')) return 'trip_creation';
    return context;
  }, [pathname, context, user]);

  const currentContext = getContextFromPath();

  // Memoized contextual greeting function
  const getContextualGreeting = useCallback(() => {
    const greetings = {
      marketing: `Hi! I'm PO, your travel planning buddy! ✈️ Let's plan an amazing trip together!`,
      trip_creation: `🌟 **Welcome to AI Trip Planning!** 🌟

I'm PO, your personal travel assistant, and I'm excited to help you create the perfect trip! Let me ask you a few questions to understand what you're looking for:

**1. Where would you like to go?** 
Please tell me your dream destination(s) - it could be a specific city, country, or even just a type of experience you're looking for!

**2. When are you planning to travel?**
Let me know your preferred dates or time of year.

**3. How long is your trip?**
How many days will you be traveling?

**4. What's your travel style?**
- Adventure & outdoor activities
- Cultural experiences & museums  
- Relaxation & beaches
- Food & nightlife
- Mix of everything

**5. What's your approximate budget?**
This helps me suggest appropriate accommodations and activities.

Just start by telling me where you'd like to go, and I'll guide you through the rest! 🗺️✈️`,
      diary: `Welcome back! I'm here to help you with any questions about your trip. Need suggestions for activities, restaurants, or places to visit? 🗺️`,
      manual_entry: `Hi! I'm PO, your travel assistant. I can help you find great places to visit, restaurants to try, and accommodations to book! 🏨✈️`,
      dashboard: `Hello! I'm PO, your personal travel assistant. Ready to plan your next adventure? 🌍`,
      trip_enhancement: `🚀 **Let's Enhance Your Trip!** 🚀

I'm PO, and I'm here to help make your existing trip even better! I can help you with:

- **Add new destinations** or activities to your itinerary
- **Find better accommodations** or upgrade your current bookings  
- **Discover hidden gems** and local experiences
- **Optimize your schedule** and travel routes
- **Get recommendations** for restaurants, attractions, and activities

What would you like to improve about your trip? Just tell me what you're looking for! ✨`,
      trip_planning: `📅 **Trip Planning Mode!** 📅

I'm PO, your travel planning expert! I'm here to help you organize and plan every detail of your trip:

- **Create detailed itineraries** day by day
- **Plan your route** and transportation
- **Schedule activities** and make reservations
- **Budget planning** and expense tracking
- **Weather considerations** and packing suggestions

What aspect of your trip would you like to plan together? 🗺️✈️`
    };
    
    return greetings[currentContext] || greetings.dashboard;
  }, [currentContext]);

  // Load conversation history on mount
  useEffect(() => {
    if (user && tripId) {
      // User is signed in and has a trip - load conversation history
      loadConversationHistory();
    } else if (user && !tripId) {
      // User is signed in but no specific trip - show personalized greeting
      const greeting = getContextualGreeting();
      setMessages([{
        role: 'assistant',
        content: greeting,
        timestamp: new Date()
      }]);
      setShowPreAuthNotice(false);
    } else if (!user && currentContext === 'marketing') {
      // User is not signed in - show marketing message
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
  }, [user, tripId, currentContext, getContextualGreeting]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Monitor conversation for trip planning content to enable diary generation
  useEffect(() => {
    if (!user || messages.length < 3) {
      setCanGenerateDiary(false);
      return;
    }

    // Check if conversation contains trip planning keywords
    const conversationText = messages.map(m => m.content).join(' ').toLowerCase();
    const tripPlanningKeywords = [
      'destination', 'trip', 'travel', 'visit', 'itinerary', 'day 1', 'day 2', 'day 3',
      'hotel', 'accommodation', 'restaurant', 'activity', 'sightseeing', 'budget',
      'flight', 'transport', 'schedule', 'morning', 'afternoon', 'evening'
    ];

    const hasMultipleKeywords = tripPlanningKeywords.filter(keyword => 
      conversationText.includes(keyword)
    ).length >= 3;

    const hasStructuredContent = conversationText.includes('day ') || 
                                conversationText.includes('itinerary') ||
                                conversationText.includes('schedule');

    setCanGenerateDiary(hasMultipleKeywords && hasStructuredContent && !tripId);
  }, [messages, user, tripId]);

  const loadConversationHistory = useCallback(async () => {
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
  }, [user, tripId, getContextualGreeting]);

  const sendMessage = useCallback(async () => {
    if (!inputMessage.trim()) return;

    const newMessage: Message = {
      role: 'user',
      content: inputMessage,
      timestamp: new Date(),
    };

    const updatedMessages = [...messages, newMessage];
    setMessages(updatedMessages);
    setInputMessage('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/assistant/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: inputMessage,
          context: currentContext,
          tripId,
          userId: user?.id,
          conversationHistory: messages.map(m => ({
            role: m.role,
            content: m.content
          }))
        }),
      });

      if (!response.ok) {
        throw new Error('API Error');
      }

      const data = await response.json();

      const newAssistantMessage: Message = {
        role: 'assistant',
        content: data.message,
        timestamp: new Date(),
        diaryWriteData: data.diaryWriteData,
        searchResults: data.searchResults || [], // Store search results
      };

      setMessages(prevMessages => [...prevMessages, newAssistantMessage]);
      setConversationId(data.conversationId);

    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: Message = {
        role: 'assistant',
        content: "I'm having trouble connecting. Please try again later.",
        timestamp: new Date(),
      };
      setMessages(prevMessages => [...prevMessages, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [user, inputMessage, messages, tripId, currentContext, conversationId]);

  const handleAddToDiary = useCallback(async (diaryData: any, messageTimestamp: Date) => {
    if (!tripId) return;
    const timestamp = messageTimestamp.getTime();
    setIsWritingToDiary(timestamp);

    try {
      const response = await fetch(`/api/trips/${tripId}/diary/write`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(diaryData),
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Failed to write to diary: ${errorData}`);
      }

      setProcessedDiaryWrites(prev => new Set(prev).add(timestamp));
      console.log('Successfully added to diary!');

    } catch (error) {
      console.error('Error writing to diary:', error);
    } finally {
      setIsWritingToDiary(null);
    }
  }, [tripId]);

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    // Send message on Shift+Enter
    if (e.key === 'Enter' && e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
    
    // Adjust textarea height on input
    const textarea = e.target as HTMLTextAreaElement;
    const lineHeight = parseInt(window.getComputedStyle(textarea).lineHeight);
    const maxHeight = 120; // max height in pixels
    
    // Reset height to auto to get proper scrollHeight
    textarea.style.height = 'auto';
    
    // Calculate new height
    const newHeight = Math.min(textarea.scrollHeight, maxHeight);
    textarea.style.height = `${newHeight}px`;
  }, [sendMessage]);

  const handleFocus = useCallback(() => {
    setInputFocused(true);
  }, []);

  const handleBlur = useCallback(() => {
    setInputFocused(false);
  }, []);

  // Maintain input focus after state updates
  useEffect(() => {
    if (inputFocused && inputRef.current && !isLoading) {
      const timeoutId = setTimeout(() => {
        inputRef.current?.focus();
      }, 0);
      return () => clearTimeout(timeoutId);
    }
  }, [inputMessage, inputFocused, isLoading]);

  // Chat Interface Component - Memoized to prevent unnecessary re-renders
  const ChatInterface = useMemo(() => (
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
        
        {memoizedMessages.map((msg, index) => (
          <div key={`${msg.timestamp.getTime()}-${index}`} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} mb-4`}>
            <div className={`max-w-xs lg:max-w-md px-4 py-3 rounded-2xl ${msg.role === 'user' ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-800'}`}>
              <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
              {msg.role === 'assistant' && msg.searchResults && msg.searchResults.length > 0 && (
                <div className="mt-3 space-y-2">
                  <h4 className="text-sm font-semibold text-gray-700">I also found these for you:</h4>
                  {msg.searchResults.map((result, idx) => (
                    <SearchResultCard key={result.id || `search-result-${idx}`} result={result} index={idx} />
                  ))}
                </div>
              )}
              {msg.role === 'assistant' && msg.diaryWriteData && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <button
                    onClick={() => handleAddToDiary(msg.diaryWriteData, msg.timestamp)}
                    disabled={processedDiaryWrites.has(msg.timestamp.getTime()) || isWritingToDiary === msg.timestamp.getTime()}
                    className="w-full flex items-center justify-center space-x-2 bg-green-500 hover:bg-green-600 text-white py-2 px-3 rounded-lg font-medium text-sm transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {isWritingToDiary === msg.timestamp.getTime() ? (
                      <span>Adding...</span>
                    ) : processedDiaryWrites.has(msg.timestamp.getTime()) ? (
                      <span>Added to Diary!</span>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        <span>Add to My Trip Diary</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start mb-4">
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

      {/* AI Diary Generation Button */}
      {canGenerateDiary && (
        <div className="px-4 py-2 border-t border-gray-100 bg-orange-50">
          <button
            onClick={() => setShowAIDiaryModal(true)}
            className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white py-2 px-4 rounded-lg font-medium transition-all duration-200 transform hover:scale-105"
          >
            <Sparkles className="h-4 w-4" />
            <span>Create Trip Diary from Chat</span>
          </button>
        </div>
      )}

      {/* Location Widget */}
      {showLocationWidget && (
        <div className="px-4 py-2 border-t border-gray-100 bg-orange-50">
          <LocationCurrencyWidget 
            compact={true}
            onLocationDetected={() => setShowLocationWidget(false)}
            onCurrencyConverted={() => {}}
          />
        </div>
      )}

      {/* Input - Multi-line support for chat-like experience */}
      <div className="p-4 border-t border-gray-200 bg-white">
        <div className="flex space-x-2">
          <textarea
            ref={inputRef}
            value={inputMessage}
            onChange={handleInputChange}
            onKeyDown={handleKeyPress}
            onFocus={handleFocus}
            onBlur={handleBlur}
            placeholder="Ask PO anything about your trip... (Shift+Enter to send)"
            className="flex-1 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-base resize-none min-h-[45px] max-h-[120px] overflow-y-auto"
            disabled={isLoading}
            rows={1}
            style={{ height: 'auto' }}
          />
          <button
            onClick={sendMessage}
            disabled={isLoading || !inputMessage.trim()}
            className="p-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
            title="Send message (Shift+Enter)"
          >
            <IoSend className="w-5 h-5" />
          </button>
        </div>
      </div>
    </>
  ), [isLoading, onMinimize, showPreAuthNotice, user, memoizedMessages, inputMessage, handleInputChange, handleKeyPress, handleFocus, handleBlur, sendMessage]);

  // Floating PO icon when minimized - Improved for mobile
  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
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
        
        {/* Chat Modal - Fixed for mobile */}
        <AnimatePresence>
          {isOpen && (
            <div className="fixed inset-0 z-50 md:absolute md:bottom-20 md:right-0 md:inset-auto">
              <div className="h-full w-full bg-white md:w-96 md:h-[500px] md:rounded-lg md:shadow-2xl border-0 md:border border-gray-200 flex flex-col">
                {ChatInterface}
              </div>
            </div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // Full-screen or embedded chat interface
  return (
    <>
      <div className={`${className} ${isMinimized ? '' : 'h-full flex flex-col'}`}>
        {ChatInterface}
      </div>
      
      {/* AI Diary Adoption Modal */}
      <AIDiaryAdoptionModal
        isOpen={showAIDiaryModal}
        onClose={() => setShowAIDiaryModal(false)}
        conversationId={conversationId || undefined}
        tripId={tripId}
      />
    </>
  );
}

// Export memoized component to prevent unnecessary re-renders from parent
export default memo(UnifiedPOAssistant);