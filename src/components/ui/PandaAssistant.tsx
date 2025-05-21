// src/components/ui/PandaAssistant.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence, HTMLMotionProps } from 'framer-motion';
import { IoClose, IoExpand, IoContract } from 'react-icons/io5';
import { getEmotionImagePath, getLogoIconPath, getFallbackLogoPath } from '@/utils/imagePaths';

type Emotion = 'happy' | 'thinking' | 'excited' | 'confused' | 'sad';

type ResponseButton = {
  text: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'outline';
};

type PandaAssistantProps = {
  message?: string;
  emotion?: Emotion;
  onMessageClose?: () => void;
  onMessageClick?: () => void;
  showMessage?: boolean;
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left' | 'center';
  size?: 'sm' | 'md' | 'lg';
  animate?: boolean;
  initiallyVisible?: boolean; // Control initial visibility state
  persistState?: boolean; // Whether to persist visibility state in localStorage
  responseButtons?: ResponseButton[]; // Array of response buttons
};

export const PandaAssistant: React.FC<PandaAssistantProps> = ({
  message,
  emotion = 'happy',
  onMessageClose,
  onMessageClick,
  showMessage = true,
  position = 'bottom-right',
  size = 'md',
  animate = true,
  initiallyVisible = true,
  persistState = true,
  responseButtons = []
}) => {
  // SSR-safe initial state
  const [visible, setVisible] = useState(initiallyVisible);
  const [minimized, setMinimized] = useState(false);

  // After mount, initialize visibility from localStorage if needed
  useEffect(() => {
    if (persistState && typeof window !== 'undefined') {
      const savedState = localStorage.getItem('pandaAssistantState');
      if (savedState) {
        const { visible: savedVisible, minimized: savedMinimized } = JSON.parse(savedState);
        setVisible(savedVisible);
        setMinimized(savedMinimized);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [isHovered, setIsHovered] = useState(false);
  const [bouncing, setBouncing] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [fallbackAttempted, setFallbackAttempted] = useState(false);

  // Size mapping
  const sizeMap = {
    sm: { width: 60, height: 60 },
    md: { width: 80, height: 80 },
    lg: { width: 100, height: 100 },
  };

  // Position mapping
  const positionClasses = {
    'bottom-right': 'bottom-6 right-6',
    'bottom-left': 'bottom-6 left-6',
    'top-right': 'top-6 right-6',
    'top-left': 'top-6 left-6',
    'center': 'bottom-6 left-1/2 transform -translate-x-1/2',
  };

  // Add occasional bounce animation
  useEffect(() => {
    if (animate && visible && !minimized) {
      const interval = setInterval(() => {
        setBouncing(true);
        setTimeout(() => setBouncing(false), 1000);
      }, 10000); // Every 10 seconds
      
      return () => clearInterval(interval);
    }
  }, [animate, visible, minimized]);
  
  // Save visibility state to localStorage when it changes
  useEffect(() => {
    if (typeof window !== 'undefined' && persistState) {
      localStorage.setItem('pandaAssistantState', JSON.stringify({ visible, minimized }));
    }
  }, [visible, minimized, persistState]);
  
  // Toggle visibility
  const toggleVisibility = () => {
    setVisible(!visible);
  };
  
  // Toggle minimized state
  const toggleMinimized = (e: React.MouseEvent) => {
    e.stopPropagation();
    setMinimized(!minimized);
  };
  
  // Close the assistant
  const closeAssistant = (e: React.MouseEvent) => {
    e.stopPropagation();
    setVisible(false);
  };

  // Get the emotion image using the utility function
  const getEmotionImage = () => {
    return getEmotionImagePath(emotion);
  };
  
  // Get the logo image for minimized state using the utility function
  const getLogoImage = () => {
    return getLogoIconPath();
  };
  
  // Get fallback logo image using the utility function
  const getFallbackLogoImage = () => {
    return getFallbackLogoPath();
  };

  // Handle image error
  const handleImageError = () => {
    console.warn(`Failed to load image: ${getEmotionImage()}`);
    
    // Only set imageError if we haven't already tried the fallback
    if (!fallbackAttempted) {
      setImageError(true);
      setFallbackAttempted(true);
    }
  };
  
  // Handle fallback image error
  const handleFallbackError = () => {
    console.warn("Failed to load fallback image");
    // You could implement additional fallback strategies here
  };
  
  // No need for preloading here as it's handled by the imagePaths utility

  // If not visible, render only a small button to bring back the assistant
  if (!visible) {
    return (
      <div className={`fixed ${positionClasses[position]} z-50`}>
        <button
          onClick={toggleVisibility}
          className="bg-backpack-orange text-white p-2 rounded-full shadow-lg"
          aria-label="Show assistant"
          type="button"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <Image 
              src={getLogoImage()} 
              alt="Travel Panda" 
              width={30} 
              height={30} 
              className="rounded-full"
              onError={handleFallbackError}
              unoptimized={true} // Required for Netlify static export
              priority
            />
          </motion.div>
        </button>
      </div>
    );
  }
  
  return (
    <div className={`fixed ${positionClasses[position]} z-50 flex flex-col items-end`}>
      {/* Controls for the assistant */}
      <div className="flex space-x-1 mb-2">
        <button
          onClick={toggleMinimized}
          className="bg-white p-1 rounded-full shadow-md text-gray-600 hover:text-backpack-orange"
          aria-label={minimized ? "Expand" : "Minimize"}
          type="button"
        >
          <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
            {minimized ? <IoExpand size={16} /> : <IoContract size={16} />}
          </motion.div>
        </button>
        
        <button
          onClick={closeAssistant}
          className="bg-white p-1 rounded-full shadow-md text-gray-600 hover:text-red-500"
          aria-label="Close assistant"
          type="button"
        >
          <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
            <IoClose size={16} />
          </motion.div>
        </button>
      </div>
      
      <AnimatePresence>
        {!minimized && showMessage && message && (
          <div 
            onClick={onMessageClick}
            className="mb-3 max-w-xs bg-white rounded-xl p-4 shadow-lg speech-bubble cursor-pointer"
          >
            <motion.div 
              initial={{ opacity: 0, y: 10, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.9 }}
            >
              <div className="flex flex-col">
                <div className="flex justify-between items-start">
                  <div className="font-medium text-sm">{message}</div>
                  {onMessageClose && (
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        onMessageClose();
                      }}
                      className="ml-2 text-gray-400 hover:text-gray-600"
                      type="button"
                    >
                      ×
                    </button>
                  )}
                </div>
                
                {/* Response buttons */}
                {responseButtons && responseButtons.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {responseButtons.map((button, index) => {
                      const variantClasses = {
                        primary: 'bg-backpack-orange text-white hover:bg-backpack-orange/90',
                        secondary: 'bg-bamboo-dark text-white hover:bg-bamboo-dark/90',
                        outline: 'border border-backpack-orange text-backpack-orange hover:bg-backpack-orange/10'
                      };
                      
                      return (
                        <button
                          key={index}
                          onClick={(e) => {
                            e.stopPropagation();
                            button.onClick();
                          }}
                          className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${variantClasses[button.variant || 'primary']}`}
                          type="button"
                        >
                          {button.text}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      
      <div className="cursor-pointer panda-shadow">
        <motion.div
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          animate={bouncing ? { y: [0, -10, 0] } : {}}
        >
          {minimized ? (
            <button
              onClick={() => setMinimized(false)}
              className="bg-transparent border-none p-0 m-0"
              style={{ boxShadow: 'none', background: 'none' }}
              aria-label="Expand assistant"
              type="button"
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
            >
              {/* Always show the logo in minimized mode */}
              <Image 
                src={getLogoImage()}
                alt="Travel Panda"
                width={sizeMap['sm'].width}
                height={sizeMap['sm'].height}
                className="rounded-full"
                priority
                unoptimized={true} // Required for Netlify static export
                onError={() => {
                  console.warn('Logo image failed to load, trying fallback');
                  // No fallback needed for minimized view
                }}
              />
            </button>
          ) : (
            <button
              onClick={() => {}} // Empty onClick handler to make it clickable
              className="bg-transparent border-none p-0 m-0"
              style={{ boxShadow: 'none', background: 'none' }}
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
              type="button"
            >
              {imageError ? (
                // Fallback using proper logo
                <Image 
                  src={getFallbackLogoImage()}
                  alt="Travel Panda"
                  width={sizeMap[size].width}
                  height={sizeMap[size].height}
                  className="rounded-full"
                  priority
                  unoptimized={true} // Required for Netlify static export
                  onError={handleFallbackError}
                />
              ) : (
                // Regular image display
                <Image 
                  src={getEmotionImage()}
                  alt="Travel Panda"
                  width={sizeMap[size].width}
                  height={sizeMap[size].height}
                  className="rounded-full"
                  priority
                  unoptimized={true} // Required for Netlify static export
                  onError={handleImageError}
                />
              )}
            </button>
          )}
        </motion.div>
      </div>
    </div>
  );
};