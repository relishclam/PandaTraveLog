import React, { useState, useEffect } from 'react';
import Image from 'next/image';

interface PoGuideProps {
  message?: string;
  // Only include actual emotion types plus 'map' for the map icon
  type?: 'happy' | 'thinking' | 'excited' | 'confused' | 'sad' | 'map';
  size?: 'small' | 'medium' | 'large';
  animated?: boolean;
  className?: string;
}

export const PoGuide: React.FC<PoGuideProps> = ({ 
  message, 
  type = 'happy', 
  size = 'medium',
  animated = true,
  className = '' // Add default empty string
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
  
  // Use maps icon for map type, emotions for others
  const getImagePath = () => {
    if (type === 'map') {
      return '/panda-maps-icon.png';
    }
    return `/images/po/emotions/${type}.png`;
  };

  const imagePath = getImagePath();
  
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
      case 'map':
        return 'bg-backpack-orange/10 border-backpack-orange';
      case 'happy':
        return 'bg-bamboo-light border-green-500';
      case 'excited':
        return 'bg-backpack-orange/10 border-backpack-orange';
      case 'thinking':
      case 'confused':
        return 'bg-blue-50 border-blue-300';
      case 'sad':
        return 'bg-gray-100 border-gray-300';
      default:
        return 'bg-white border-gray-200';
    }
  };
  
  // Map appropriate emotions to contexts
  const getDefaultMessage = () => {
    switch (type) {
      case 'map':
        return "Click on places you'd like to visit!";
      case 'excited':
        return "I've got some great suggestions!";
      case 'happy':
        return "Welcome to your travel planner!";
      case 'thinking':
        return "Let me plan this for you...";
      case 'confused':
        return "Hmm, I need more details...";
      case 'sad':
        return "Oh no, something went wrong...";
      default:
        return "Hi, I'm PO!";
    }
  };

  const displayMessage = message || getDefaultMessage();

  return (
    <div className={`flex flex-col items-center ${sizeClasses[size].container} ${className}`}>
      {/* Speech bubble */}
      <div 
        className={`
          relative mb-2 rounded-lg border ${getBubbleColor()} 
          ${sizeClasses[size].bubble} w-full
        `}
      >
        <p className="text-center">{displayMessage}</p>
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
