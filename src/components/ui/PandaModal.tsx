// components/ui/PandaModal.tsx
'use client';

import { useState } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { IoClose } from 'react-icons/io5';

// Simple button component
const Button = ({ 
  children,
  onClick,
  variant = "primary"
}: { 
  children: React.ReactNode, 
  onClick?: () => void,
  variant?: "primary" | "outline" 
}) => {
  const baseStyles = "px-4 py-2 rounded-md font-medium";
  const variantStyles = variant === "primary" 
    ? "bg-orange-500 text-white hover:bg-orange-600" 
    : "border border-orange-500 text-orange-500 hover:bg-orange-50";
  
  return (
    <button 
      className={`${baseStyles} ${variantStyles}`}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
};

type PandaModalProps = {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  emotion?: 'happy' | 'thinking' | 'excited' | 'confused';
  primaryAction?: {
    text: string;
    onClick: () => void;
  };
  secondaryAction?: {
    text: string;
    onClick: () => void;
  };
  children?: React.ReactNode;
};

export function PandaModal({
  isOpen,
  onClose,
  title,
  message,
  emotion = 'excited',
  primaryAction,
  secondaryAction,
  children
}: PandaModalProps) {
  // Get emotion image
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
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 z-50 flex items-center justify-center backdrop-blur-sm">
      <div
        style={{
          backgroundColor: 'rgba(244, 255, 232, 0.95)',
          borderRadius: '0.75rem',
          padding: '1.5rem',
          maxWidth: '28rem',
          width: '100%',
          margin: '1rem',
          border: '2px solid #f97316',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          position: 'relative'
        }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
          aria-label="Close"
        >
          <IoClose size={24} />
        </button>
        
        {/* Panda avatar */}
        <div className="flex justify-center -mt-12 mb-2">
          <div className="bg-white rounded-full p-2 border-2 border-orange-500 shadow-lg">
            <Image
              src={getEmotionImage()}
              alt="PO the Travel Panda"
              width={80}
              height={80}
              className="rounded-full"
              unoptimized={true}
            />
          </div>
        </div>
        
        {/* Content */}
        <div className="text-center">
          <h3 className="text-2xl font-bold text-gray-900 mb-2">
            {title}
          </h3>
          <p className="text-gray-700 mb-4">
            {message}
          </p>
          
          {children && (
            <div className="my-4">
              {children}
            </div>
          )}
          
          {/* Action buttons */}
          <div className="flex justify-center space-x-3 mt-4">
            {secondaryAction && (
              <Button
                variant="outline"
                onClick={secondaryAction.onClick}
              >
                {secondaryAction.text}
              </Button>
            )}
            
            {primaryAction && (
              <Button
                onClick={primaryAction.onClick}
              >
                {primaryAction.text}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
