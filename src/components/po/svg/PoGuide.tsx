import React, { useState, useEffect } from 'react';
import Image from 'next/image';

interface PoGuideProps {
  message: string;
  type?: 'happy' | 'thinking' | 'excited' | 'sad';
  size?: 'small' | 'medium' | 'large';
  animated?: boolean;
}

export const PoGuide: React.FC<PoGuideProps> = ({ 
  message, 
  type = 'happy', 
  size = 'medium',
  animated = true 
}) => {
  const [isAnimated, setIsAnimated] = useState(false);
  
  useEffect(() => {
    if (animated) {
      setIsAnimated(true);
      
      // Reset animation after 2 seconds if not sad/thinking
      if (type !== 'sad' && type !== 'thinking') {
        const timer = setTimeout(() => {
          setIsAnimated(false);
        }, 2000);
        
        return () => clearTimeout(timer);
      }
    }
  }, [message, animated, type]);
  
  // Image paths based on type
  const imagePath = `/images/po/emotions/${type}.png`;
  
  // Size classes
  const sizeClasses = {
    small: {
      container: "max-w-[200px]",
      image: "w-14 h-14",
      bubble: "text-xs p-2"
    },
    medium: {
      container: "max-w-[300px]",
      image: "w-20 h-20",
      bubble: "text-sm p-3"
    },
    large: {
      container: "max-w-[400px]",
      image: "w-24 h-24",
      bubble: "text-base p-4"
    }
  };
  
  // Animation classes
  const getAnimationClass = () => {
    if (!isAnimated) return '';
    
    switch (type) {
      case 'happy':
        return 'animate-bounce';
      case 'excited':
        return 'animate-pulse';
      case 'thinking':
        return 'animate-pulse-slow';
      case 'sad':
        return 'animate-shake-subtle';
      default:
        return '';
    }
  };
  
  // Speech bubble color
  const getBubbleColor = () => {
    switch (type) {
      case 'happy':
        return 'bg-bamboo-light border-green-500';
      case 'excited':
        return 'bg-backpack-orange/10 border-backpack-orange';
      case 'thinking':
        return 'bg-blue-50 border-blue-300';
      case 'sad':
        return 'bg-gray-100 border-gray-300';
      default:
        return 'bg-white border-gray-200';
    }
  };
  
  return (
    <div className={`flex flex-col items-center ${sizeClasses[size].container}`}>
      {/* Speech bubble */}
      <div 
        className={`
          relative mb-2 rounded-lg border ${getBubbleColor()} 
          ${sizeClasses[size].bubble} w-full
        `}
      >
        <p className="text-center">{message}</p>
        {/* Triangle pointer */}
        <div 
          className={`
            absolute -bottom-2 left-1/2 transform -translate-x-1/2
            w-0 h-0 border-l-8 border-r-8 border-t-8
            border-l-transparent border-r-transparent
            ${type === 'happy' ? 'border-t-green-500' : 
              type === 'excited' ? 'border-t-backpack-orange' : 
              type === 'thinking' ? 'border-t-blue-300' : 
              'border-t-gray-300'}
          `}
        />
      </div>
      
      {/* PO image */}
      <div className={`${sizeClasses[size].image} ${getAnimationClass()}`}>
        <Image
          src={imagePath}
          alt={`PO the Travel Panda is ${type}`}
          width={96}
          height={96}
          className="object-contain w-full h-full drop-shadow-md"
        />
      </div>
    </div>
  );
};

// Add the animation classes to tailwind
// You would need to add these to your tailwind config
/**
 * Add these to your tailwind.config.js:
 * 
 * extend: {
 *   animation: {
 *     'bounce': 'bounce 1s ease-in-out',
 *     'pulse': 'pulse 0.8s cubic-bezier(0.4, 0, 0.6, 1) infinite',
 *     'pulse-slow': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
 *     'shake-subtle': 'shake 2s ease-in-out infinite',
 *   },
 *   keyframes: {
 *     bounce: {
 *       '0%, 100%': { transform: 'translateY(0)' },
 *       '50%': { transform: 'translateY(-25%)' },
 *     },
 *     pulse: {
 *       '0%, 100%': { opacity: 1 },
 *       '50%': { opacity: 0.8 },
 *     },
 *     shake: {
 *       '0%, 100%': { transform: 'translateX(0)' },
 *       '25%': { transform: 'translateX(-5px)' },
 *       '75%': { transform: 'translateX(5px)' },
 *     },
 *   },
 * }
 */
