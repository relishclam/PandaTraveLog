import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';

interface PoTripDiaryProps {
  tripName?: string;
  destination?: string;
  onAction?: () => void;
  size?: 'small' | 'medium' | 'large';
}

/**
 * Special PO animation for Trip Diary featuring PO with travel items
 * Uses the existing PO character with additional travel-themed animations
 */
export const PoTripDiary: React.FC<PoTripDiaryProps> = ({
  tripName,
  destination,
  onAction,
  size = 'medium'
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  
  // Determine which animation to show
  const getAnimation = () => {
    if (isHovered) return "/images/po/excited.png";
    if (isAnimating) return "/images/po/map.png";
    return "/images/po/happy.png";
  };
  
  // Size classes based on specified size
  const sizeClasses = {
    small: "w-16 h-16",
    medium: "w-24 h-24",
    large: "w-32 h-32"
  };
  
  // Animation every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (!isHovered) {
        setIsAnimating(true);
        setTimeout(() => {
          setIsAnimating(false);
        }, 3000);
      }
    }, 10000);
    
    return () => clearInterval(interval);
  }, [isHovered]);
  
  // Fun trip-related messages
  const getMessage = () => {
    if (tripName && destination) {
      return `Your ${tripName} adventure to ${destination} awaits!`;
    }
    if (destination) {
      return `Can't wait to explore ${destination} with you!`;
    }
    if (tripName) {
      return `Your ${tripName} trip is going to be amazing!`;
    }
    return "Let's plan your perfect itinerary!";
  };
  
  return (
    <div className="flex flex-col items-center max-w-sm mx-auto">
      {/* Speech bubble */}
      <motion.div 
        className="bg-bamboo-light border border-leaf-green rounded-lg p-3 mb-2 relative text-center"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <p className="text-sm font-panda">{getMessage()}</p>
        {/* Triangle pointer */}
        <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-leaf-green"></div>
      </motion.div>
      
      {/* PO with travel items */}
      <div className="relative">
        <motion.div
          className={`relative ${sizeClasses[size]}`}
          onHoverStart={() => setIsHovered(true)}
          onHoverEnd={() => setIsHovered(false)}
          onClick={onAction}
          whileHover={{ scale: 1.1 }}
          animate={isAnimating ? { y: [0, -10, 0] } : {}}
          transition={{ duration: 0.5, repeat: isAnimating ? 3 : 0 }}
        >
          <Image
            src={getAnimation()}
            alt="PO the Travel Panda"
            width={128}
            height={128}
            className="object-contain w-full h-full drop-shadow-md"
          />
          
          {/* Travel accessories that appear on hover */}
          {isHovered && (
            <>
              <motion.div 
                className="absolute -top-4 -right-4"
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 }}
              >
                <Image 
                  src="/images/po/accessories/camera.png" 
                  alt="Camera" 
                  width={24} 
                  height={24}
                  className="object-contain"
                />
              </motion.div>
              
              <motion.div 
                className="absolute -bottom-2 -left-4"
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
              >
                <Image 
                  src="/images/po/accessories/backpack.png" 
                  alt="Backpack" 
                  width={24} 
                  height={24}
                  className="object-contain"
                />
              </motion.div>
            </>
          )}
        </motion.div>
        
        {/* Label */}
        <motion.div 
          className="mt-2 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <span className="text-xs font-panda text-gray-600">
            {isHovered ? "Click me!" : "Your Travel Guide"}
          </span>
        </motion.div>
      </div>
    </div>
  );
};

export default PoTripDiary;
