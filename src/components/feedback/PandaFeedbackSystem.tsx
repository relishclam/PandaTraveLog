'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface PandaFeedbackSystemProps {
  isOpen: boolean;
  onClose: () => void;
  context?: {
    page?: string;
    action?: string;
    searchQuery?: string;
    results?: any[];
  };
}

interface FeedbackData {
  type: 'bug' | 'suggestion' | 'search_issue' | 'general';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  context?: any;
  userAgent?: string;
  timestamp: string;
}

const PandaFeedbackSystem: React.FC<PandaFeedbackSystemProps> = ({
  isOpen,
  onClose,
  context
}) => {
  const [feedbackType, setFeedbackType] = useState<FeedbackData['type']>('general');
  const [severity, setSeverity] = useState<FeedbackData['severity']>('medium');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [pandaEmotion, setPandaEmotion] = useState<'happy' | 'thinking' | 'excited' | 'sad'>('thinking');

  const sendFeedbackToAI = async (feedbackData: FeedbackData) => {
    try {
      const response = await fetch('/api/feedback/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          feedback: feedbackData,
          aiAnalysis: true // Flag to send to OpenRouter for AI analysis
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to submit feedback: ${response.status}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error submitting feedback:', error);
      throw error;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim() || !description.trim()) {
      setPandaEmotion('sad');
      return;
    }

    setIsSubmitting(true);
    setPandaEmotion('thinking');

    try {
      const feedbackData: FeedbackData = {
        type: feedbackType,
        severity,
        title: title.trim(),
        description: description.trim(),
        context: {
          ...context,
          url: window.location.href,
          userAgent: navigator.userAgent
        },
        timestamp: new Date().toISOString()
      };

      await sendFeedbackToAI(feedbackData);
      
      setSubmitStatus('success');
      setPandaEmotion('excited');
      
      // Auto-close after success
      setTimeout(() => {
        onClose();
        resetForm();
      }, 2000);
      
    } catch (error) {
      setSubmitStatus('error');
      setPandaEmotion('sad');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFeedbackType('general');
    setSeverity('medium');
    setTitle('');
    setDescription('');
    setSubmitStatus('idle');
    setPandaEmotion('thinking');
  };

  const getPandaExpression = () => {
    switch (pandaEmotion) {
      case 'happy': return '😊';
      case 'thinking': return '🤔';
      case 'excited': return '🤩';
      case 'sad': return '😔';
      default: return '🤔';
    }
  };

  const getFeedbackTypeIcon = (type: FeedbackData['type']) => {
    switch (type) {
      case 'bug': return '🐛';
      case 'suggestion': return '💡';
      case 'search_issue': return '🔍';
      case 'general': return '💬';
      default: return '💬';
    }
  };

  const getSeverityColor = (sev: FeedbackData['severity']) => {
    switch (sev) {
      case 'low': return 'text-green-600 bg-green-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'high': return 'text-orange-600 bg-orange-100';
      case 'critical': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  console.log('PandaFeedbackSystem render - isOpen:', isOpen);
  
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
        <motion.div
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.7, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="relative w-full max-w-2xl mx-4 bg-white rounded-xl shadow-xl"
          onClick={(e: React.MouseEvent) => e.stopPropagation()}
        >
          {/* Header with Panda Assistant */}
          <div className="flex items-center p-6 bg-gradient-to-r from-green-500 to-emerald-600 rounded-t-xl">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-2xl">
                {getPandaExpression()}
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Panda Assistant Feedback</h2>
                <p className="text-green-100 text-sm">
                  {submitStatus === 'success' ? 'Thank you for your feedback!' :
                   submitStatus === 'error' ? 'Oops! Something went wrong.' :
                   'Help me improve PandaTravelLog!'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="ml-auto p-2 text-white hover:text-green-200 transition-colors"
              aria-label="Close feedback"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Form Content */}
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Feedback Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                What type of feedback is this?
              </label>
              <div className="grid grid-cols-2 gap-3">
                {(['bug', 'suggestion', 'search_issue', 'general'] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setFeedbackType(type)}
                    className={`p-3 rounded-lg border-2 transition-all ${
                      feedbackType === type
                        ? 'border-green-500 bg-green-50 text-green-700'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <span className="text-lg">{getFeedbackTypeIcon(type)}</span>
                      <span className="font-medium capitalize">{type.replace('_', ' ')}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Severity */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                How urgent is this?
              </label>
              <div className="flex space-x-2">
                {(['low', 'medium', 'high', 'critical'] as const).map((sev) => (
                  <button
                    key={sev}
                    type="button"
                    onClick={() => setSeverity(sev)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                      severity === sev
                        ? getSeverityColor(sev)
                        : 'text-gray-600 bg-gray-100 hover:bg-gray-200'
                    }`}
                  >
                    {sev.charAt(0).toUpperCase() + sev.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Title */}
            <div>
              <label htmlFor="feedback-title" className="block text-sm font-medium text-gray-700 mb-2">
                Brief Summary
              </label>
              <input
                id="feedback-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Search returns wrong countries for 'Vietnam'"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                required
              />
            </div>

            {/* Description */}
            <div>
              <label htmlFor="feedback-description" className="block text-sm font-medium text-gray-700 mb-2">
                Detailed Description
              </label>
              <textarea
                id="feedback-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Please describe the issue or suggestion in detail..."
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                required
              />
            </div>

            {/* Context Info */}
            {context && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Context Information:</h4>
                <div className="text-xs text-gray-600 space-y-1">
                  {context.page && <div>Page: {context.page}</div>}
                  {context.action && <div>Action: {context.action}</div>}
                  {context.searchQuery && <div>Search Query: "{context.searchQuery}"</div>}
                  {context.results && <div>Results Count: {context.results.length}</div>}
                </div>
              </div>
            )}

            {/* Submit Button */}
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-3 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !title.trim() || !description.trim()}
                className="px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-medium rounded-lg transition-colors flex items-center space-x-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Sending...</span>
                  </>
                ) : (
                  <>
                    <span>Send Feedback</span>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default PandaFeedbackSystem;
