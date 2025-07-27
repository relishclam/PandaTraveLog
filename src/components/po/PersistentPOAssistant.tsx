'use client';

import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Minimize2, Maximize2, MapPin, DollarSign, Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { LocationCurrencyWidget } from './LocationCurrencyWidget';
import { useLocationFeatures, useCurrencyConverter } from '@/hooks/useLocationCurrency';
import { useAuth } from '@/contexts/AuthContext';

interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
}

interface PersistentPOAssistantProps {
  initialContext?: 'marketing' | 'trip_creation' | 'diary' | 'manual_entry' | 'dashboard';
  tripId?: string;
}

export function PersistentPOAssistant({ 
  initialContext = 'dashboard', 
  tripId 
}: PersistentPOAssistantProps) {
  const { user } = useAuth();
  const { userLocation, getLocationString } = useLocationFeatures();
  const { preferredCurrency } = useCurrencyConverter();
  
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showLocationWidget, setShowLocationWidget] = useState(false);
  const [context, setContext] = useState(initialContext);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen && !isMinimized) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, isMinimized]);

  // Initialize with welcome message
  useEffect(() => {
    if (messages.length === 0) {
      const welcomeMessage: Message = {
        id: 'welcome',
        content: getWelcomeMessage(),
        role: 'assistant',
        timestamp: new Date()
      };
      setMessages([welcomeMessage]);
    }
  }, [context, user]);

  const getWelcomeMessage = () => {
    const locationInfo = userLocation ? ` I can see you're in ${getLocationString()}` : '';
    const currencyInfo = preferredCurrency !== 'USD' ? ` and your preferred currency is ${preferredCurrency}` : '';
    
    const contextMessages = {
      marketing: `Hi! I'm PO, your travel planning buddy! ✈️${locationInfo}${currencyInfo}. Ready to plan an amazing trip?`,
      trip_creation: `🌟 Welcome to AI Trip Planning! I'm PO, and I'm excited to help you create the perfect trip!${locationInfo}${currencyInfo}. Where would you like to go?`,
      diary: `Welcome back! I'm here to help with your trip planning and questions.${locationInfo}${currencyInfo}. What can I assist you with?`,
      manual_entry: `Hi! I'm PO, ready to help you with trip planning and recommendations.${locationInfo}${currencyInfo}. Need help with anything?`,
      dashboard: `Hello! I'm PO, your personal travel assistant.${locationInfo}${currencyInfo}. Ready to plan your next adventure? 🌍`
    };

    return contextMessages[context] || contextMessages.dashboard;
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputMessage,
      role: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/assistant/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: inputMessage,
          context,
          tripId,
          userId: user?.id,
          conversationHistory: messages.map(m => ({
            role: m.role,
            content: m.content
          }))
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const data = await response.json();
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: data.response,
        role: 'assistant',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: "I'm sorry, I'm having trouble connecting right now. Please try again in a moment.",
        role: 'assistant',
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
      handleSendMessage();
    }
  };

  const toggleLocationWidget = () => {
    setShowLocationWidget(!showLocationWidget);
  };

  // Floating chat bubble (minimized state)
  if (!isOpen) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          onClick={() => setIsOpen(true)}
          className="h-14 w-14 rounded-full bg-blue-600 hover:bg-blue-700 shadow-lg"
          size="lg"
        >
          <MessageCircle className="h-6 w-6 text-white" />
        </Button>
        {userLocation && (
          <div className="absolute -top-2 -left-2">
            <Badge variant="secondary" className="text-xs">
              <MapPin className="h-3 w-3 mr-1" />
              {userLocation.city}
            </Badge>
          </div>
        )}
      </div>
    );
  }

  // Full chat interface
  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Card className={`w-96 transition-all duration-300 shadow-xl ${
        isMinimized ? 'h-16' : 'h-[500px]'
      }`}>
        <CardHeader className="pb-2 px-4 py-3 bg-blue-600 text-white rounded-t-lg">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <div className="h-8 w-8 bg-white rounded-full flex items-center justify-center">
                <span className="text-blue-600 font-bold text-sm">PO</span>
              </div>
              {!isMinimized && 'Travel Assistant'}
            </CardTitle>
            <div className="flex items-center gap-1">
              {!isMinimized && (
                <>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={toggleLocationWidget}
                    className="h-8 w-8 p-0 text-white hover:bg-blue-700"
                    title="Location & Currency"
                  >
                    <MapPin className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setIsMinimized(true)}
                    className="h-8 w-8 p-0 text-white hover:bg-blue-700"
                  >
                    <Minimize2 className="h-4 w-4" />
                  </Button>
                </>
              )}
              {isMinimized && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setIsMinimized(false)}
                  className="h-8 w-8 p-0 text-white hover:bg-blue-700"
                >
                  <Maximize2 className="h-4 w-4" />
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setIsOpen(false)}
                className="h-8 w-8 p-0 text-white hover:bg-blue-700"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          {!isMinimized && (
            <div className="flex items-center gap-2 mt-2">
              {userLocation && (
                <Badge variant="secondary" className="text-xs">
                  <MapPin className="h-3 w-3 mr-1" />
                  {getLocationString()}
                </Badge>
              )}
              <Badge variant="secondary" className="text-xs">
                <DollarSign className="h-3 w-3 mr-1" />
                {preferredCurrency}
              </Badge>
            </div>
          )}
        </CardHeader>

        {!isMinimized && (
          <CardContent className="p-0 flex flex-col h-[calc(500px-80px)]">
            {showLocationWidget && (
              <div className="border-b p-4">
                <LocationCurrencyWidget 
                  compact={true}
                  onLocationDetected={() => setShowLocationWidget(false)}
                  onCurrencyConverted={() => {}}
                />
              </div>
            )}
            
            <div className="flex-1 p-4 overflow-y-auto">
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${
                      message.role === 'user' ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    <div
                      className={`max-w-[80%] p-3 rounded-lg ${
                        message.role === 'user'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-900'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      <p className="text-xs opacity-70 mt-1">
                        {message.timestamp.toLocaleTimeString([], { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </p>
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-gray-100 p-3 rounded-lg">
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </div>
                  </div>
                )}
              </div>
              <div ref={messagesEndRef} />
            </div>

            <div className="border-t p-4">
              <div className="flex gap-2">
                <Input
                  ref={inputRef}
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask me anything about travel..."
                  disabled={isLoading}
                  className="flex-1"
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={isLoading || !inputMessage.trim()}
                  size="sm"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
