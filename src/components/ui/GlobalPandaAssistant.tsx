'use client';

import React from 'react';
import Image from 'next/image'; 
import { PandaAssistant } from './PandaAssistant';
import { usePandaAssistant, PandaModalConfig, ModalAction, Emotion } from '@/contexts/PandaAssistantContext'; 

const ModalButton = ({ 
  children,
  onClick,
  variant = "primary",
  style 
}: { 
  children: React.ReactNode, 
  onClick?: () => void,
  variant?: "primary" | "outline" | "danger", 
  style?: 'primary' | 'secondary' | 'danger';
}) => {
  const baseStyles = "px-4 py-2 rounded-md font-medium focus:outline-none focus:ring-2 focus:ring-offset-2";
  let variantStyles = "";

  const effectiveStyle = style || (variant === 'outline' ? 'secondary' : 'primary');

  switch (effectiveStyle) {
    case 'primary':
      variantStyles = "bg-orange-500 text-white hover:bg-orange-600 focus:ring-orange-500";
      break;
    case 'secondary':
      variantStyles = "border border-orange-500 text-orange-500 hover:bg-orange-50 focus:ring-orange-500";
      break;
    case 'danger':
      variantStyles = "bg-red-500 text-white hover:bg-red-600 focus:ring-red-500";
      break;
    default:
      variantStyles = "bg-orange-500 text-white hover:bg-orange-600 focus:ring-orange-500";
  }
  
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

export const GlobalPandaAssistant: React.FC = () => {
  const { state, hideMainAssistant, hidePandaModal } = usePandaAssistant();

  const persistentMessage = state.floatingAssistant.visible && state.floatingAssistant.message
    ? state.floatingAssistant.message
    : state.mainAssistant.message || undefined;
    
  const persistentEmotion = state.floatingAssistant.visible
    ? state.floatingAssistant.emotion
    : state.mainAssistant.emotion;

  const persistentAssistantVisible = state.mainAssistant.visible || state.floatingAssistant.visible;

  const getModalEmotionImage = (emotion?: Emotion) => {
    switch(emotion) {
      case 'thinking': return '/images/po/emotions/thinking.png';
      case 'excited': return '/images/po/emotions/excited.png';
      case 'confused': return '/images/po/emotions/confused.png';
      case 'sad': return '/images/po/emotions/sad.png';
      case 'love': return '/images/po/emotions/love.png';
      case 'surprised': return '/images/po/emotions/surprised.png';
      case 'curious': return '/images/po/emotions/curious.png';
      case 'happy':
      default: return '/images/po/emotions/happy.png';
    }
  };

  return (
    <>
      {persistentAssistantVisible && (
        <PandaAssistant
          message={persistentMessage}
          emotion={persistentEmotion}
          showMessage={!!persistentMessage} 
          position="bottom-right"
          size="md"
          initiallyVisible={true} 
          onMessageClose={state.floatingAssistant.visible ? undefined : hideMainAssistant} 
        />
      )}

      {state.modal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm">
          <div className="bg-green-50 rounded-xl p-6 pt-10 max-w-md w-full mx-4 border-2 border-orange-500 shadow-xl relative">
            <button
              onClick={() => {
                hidePandaModal();
                // The hidePandaModal in context now handles calling state.modal.onClose
              }}
              className="absolute top-3 right-3 text-gray-600 hover:text-gray-800 transition-colors"
              aria-label="Close modal"
            >
              <svg className="w-6 h-6" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor"><path d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
            
            <div className="flex justify-center -mt-16 mb-4">
              <div className="bg-white rounded-full p-2 border-2 border-orange-500 shadow-lg">
                <Image
                  src={getModalEmotionImage(state.modal.emotion)}
                  alt="PO the Travel Panda"
                  width={80}
                  height={80}
                  className="rounded-full"
                  unoptimized={true}
                />
              </div>
            </div>
            
            <div className="text-center">
              {state.modal.title && (
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  {state.modal.title}
                </h3>
              )}
              <p className="text-gray-700 mb-4 whitespace-pre-line">
                {state.modal.message}
              </p>

              {/* Render custom content if provided */}
              {state.modal.content && (
                <div className="my-4">
                  {state.modal.content}
                </div>
              )}
              
              {(state.modal.primaryAction || state.modal.secondaryAction) && (
                <div className="flex flex-col sm:flex-row justify-center space-y-3 sm:space-y-0 sm:space-x-3 mt-6">
                  {state.modal.secondaryAction && (
                    <ModalButton
                      style={state.modal.secondaryAction.style || 'secondary'}
                      onClick={() => {
                        state.modal.secondaryAction?.onClick();
                      }}
                    >
                      {state.modal.secondaryAction.text}
                    </ModalButton>
                  )}
                  {state.modal.primaryAction && (
                    <ModalButton
                      style={state.modal.primaryAction.style || 'primary'}
                      onClick={() => {
                        state.modal.primaryAction?.onClick();
                      }}
                    >
                      {state.modal.primaryAction.text}
                    </ModalButton>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
