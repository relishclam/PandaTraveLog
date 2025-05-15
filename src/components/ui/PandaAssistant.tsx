'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';

type Emotion = 'happy' | 'thinking' | 'excited' | 'confused';

type PandaAssistantProps = {
  message?: string;
  emotion?: Emotion;
  onMessageClose?: () => void;
  onMessageClick?: () => void;
  showMessage?: boolean;
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left' | 'center';
  size?: 'sm' | 'md' | 'lg';
  animate?: boolean;
};

export const PandaAssistant: React.FC<PandaAssistantProps> = ({
  message,
  emotion = 'happy',
  onMessageClose,
  onMessageClick,
  showMessage = true,
  position = 'bottom-right',
  size = 'md',
  animate = true
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [bouncing, setBouncing] = useState(false);

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
    if (animate) {
      const interval = setInterval(() => {
        setBouncing(true);
        setTimeout(() => setBouncing(false), 1000);
      }, 10000); // Every 10 seconds
      
      return () => clearInterval(interval);
    }
  }, [animate]);

  // Map emotions to PO's expressions (images will be created later)
  const getEmotionImage = () => {
    switch(emotion) {
      case 'thinking':
        return '/images/po/thinking.png';
      case 'excited':
        return '/images/po/excited.png';
      case 'confused':
        return '/images/po/confused.png';
      case 'happy':
      default:
        return '/images/po/happy.png';
    }
  };

  return (
    <div className={`fixed ${positionClasses[position]} z-50 flex flex-col items-end`}>
      <AnimatePresence>
        {showMessage && message && (
          <motion.div 
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.9 }}
            className="mb-3 max-w-xs bg-white rounded-xl p-4 shadow-lg speech-bubble cursor-pointer"
            onClick={onMessageClick}
          >
            <div className="flex justify-between items-start">
              <div className="font-medium text-sm">{message}</div>
              {onMessageClose && (
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    onMessageClose();
                  }}
                  className="ml-2 text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      <motion.div
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        animate={bouncing ? { y: [0, -10, 0] } : {}}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="cursor-pointer panda-shadow"
      >
        <Image 
          src={getEmotionImage()}
          alt="PO the Travel Panda"
          width={sizeMap[size].width}
          height={sizeMap[size].height}
          className="rounded-full"
          priority
        />
      </motion.div>
    </div>
  );
};
